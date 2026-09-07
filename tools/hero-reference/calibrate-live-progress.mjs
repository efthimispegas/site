import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const workspaceRoot = process.cwd();
const candidateRoot = path.resolve(
  process.argv[2] ?? 'apps/pegasoft-e2e/test-output/live-calibration',
);
const manifest = JSON.parse(
  await readFile(
    path.join(workspaceRoot, 'docs/hero-reference/recording-anchors.json'),
    'utf8',
  ),
);
const candidateNames = (await readdir(candidateRoot))
  .filter((name) => /^fine-\d{4}\.png$/u.test(name))
  .sort();

if (candidateNames.length === 0) {
  throw new Error(`No fine-NNNN.png candidates found in ${candidateRoot}`);
}

const cssWidth = manifest.authority.recordingProfile.cssViewport.width;
const cssHeight = manifest.authority.recordingProfile.cssViewport.height;
const analysisScale = 0.25;
const width = Math.round(cssWidth * analysisScale);
const height = Math.round(cssHeight * analysisScale);

async function rgbImage(filePath) {
  const image = await sharp(filePath)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (image.info.channels !== 3) {
    throw new Error(`${filePath}: expected an RGB image`);
  }

  return image.data;
}

function cornerChannelMeans(image) {
  const sampleSize = 40;
  const totals = [0, 0, 0];
  let count = 0;

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      const offset = (y * width + x) * 3;
      totals[0] += image[offset];
      totals[1] += image[offset + 1];
      totals[2] += image[offset + 2];
      count += 1;
    }
  }

  return totals.map((total) => total / count);
}

function compare(reference, candidate, phase) {
  const referenceCorner = cornerChannelMeans(reference);
  const candidateCorner = cornerChannelMeans(candidate);
  const channelShift = referenceCorner.map(
    (value, index) => value - candidateCorner[index],
  );
  const crop =
    phase === 'landing'
      ? {
          left: 0,
          top: Math.round(80 * analysisScale),
          right: width,
          bottom: height,
        }
      : {
          left: Math.round(600 * analysisScale),
          top: Math.round(80 * analysisScale),
          right: width,
          bottom: height,
        };
  let alignedAbsoluteError = 0;
  let edgeAbsoluteError = 0;
  let pixels = 0;

  const luma = (image, x, y, shift = [0, 0, 0]) => {
    const offset = (y * width + x) * 3;
    return (
      (image[offset] + shift[0]) * 0.2126 +
      (image[offset + 1] + shift[1]) * 0.7152 +
      (image[offset + 2] + shift[2]) * 0.0722
    );
  };

  for (let y = crop.top; y < crop.bottom - 1; y += 1) {
    for (let x = crop.left; x < crop.right - 1; x += 1) {
      const offset = (y * width + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        alignedAbsoluteError += Math.abs(
          reference[offset + channel] -
            (candidate[offset + channel] + channelShift[channel]),
        );
      }

      const referenceEdge =
        Math.abs(luma(reference, x + 1, y) - luma(reference, x, y)) +
        Math.abs(luma(reference, x, y + 1) - luma(reference, x, y));
      const candidateEdge =
        Math.abs(
          luma(candidate, x + 1, y, channelShift) -
            luma(candidate, x, y, channelShift),
        ) +
        Math.abs(
          luma(candidate, x, y + 1, channelShift) -
            luma(candidate, x, y, channelShift),
        );
      edgeAbsoluteError += Math.abs(referenceEdge - candidateEdge);
      pixels += 1;
    }
  }

  const alignedMeanAbsoluteChannelError = alignedAbsoluteError / (pixels * 3);
  const meanAbsoluteEdgeError = edgeAbsoluteError / pixels;

  return {
    alignedMeanAbsoluteChannelError,
    meanAbsoluteEdgeError,
    score: alignedMeanAbsoluteChannelError + meanAbsoluteEdgeError * 2,
    referenceCornerRgb: referenceCorner,
    candidateCornerRgb: candidateCorner,
  };
}

const candidates = await Promise.all(
  candidateNames.map(async (name) => ({
    name,
    scrollY: Number(name.slice(5, 9)),
    image: await rgbImage(path.join(candidateRoot, name)),
  })),
);
const results = [];

for (const state of manifest.states) {
  if (['loader-mark', 'world-reveal'].includes(state.key)) {
    continue;
  }

  const phase = ['landing', 'landing-idle'].includes(state.key)
    ? 'landing'
    : state.key === 'journey-exit'
      ? 'exit'
      : 'journey';
  const reference = await rgbImage(
    path.join(workspaceRoot, state.anchor.capturePath),
  );
  const ranking = candidates
    .map((candidate) => ({
      scrollY: candidate.scrollY,
      ...compare(reference, candidate.image, phase),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 5);

  results.push({
    key: state.key,
    decodedFrameIndex: state.anchor.decodedFrameIndex,
    timestampSeconds: state.anchor.timestampSeconds,
    ranking,
  });
}

console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      authority: {
        liveSite: 'https://www.vectrfl.com/?trace=1',
        recordingSha256: manifest.authority.sourceSha256,
      },
      method: {
        candidateStepCssPx: 30,
        analysisScale,
        backgroundColorAlignment: '40x40 top-left mean RGB shift',
        landingCropCssPx: [0, 80, cssWidth, cssHeight],
        journeyCropCssPx: [600, 80, cssWidth, cssHeight],
        score:
          'aligned mean absolute RGB-channel error + 2 × mean absolute luma-edge error',
        limitation:
          'This ranks live target candidates; it does not prove local-effect phase, asset rights, or final silhouette tolerance.',
      },
      results,
    },
    null,
    2,
  ),
);
