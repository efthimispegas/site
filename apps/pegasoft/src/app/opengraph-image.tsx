import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#f8f5ee',
          color: '#111111',
          fontFamily: 'Georgia',
        }}
      >
        <div style={{ fontSize: 34, color: '#8c6a24' }}>Pegasoft</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 88,
            lineHeight: 0.95,
          }}
        >
          <span>Design that</span>
          <span>delivers.</span>
        </div>
        <div style={{ fontSize: 28 }}>
          Digital product solutions with delivery quality.
        </div>
      </div>
    ),
    size,
  );
}
