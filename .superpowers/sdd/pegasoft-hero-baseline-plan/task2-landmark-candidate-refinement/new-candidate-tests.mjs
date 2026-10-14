// Break caught: a neutral antialias fringe attached to an excluded red rail
// must block use of the otherwise eligible component, without deleting its
// diagnostic support. Literal areas come from the rectangles below.
test('candidate rejects contour-connected red ambiguity while preserving diagnostic building support', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [25,30,5,6,[213,201,213]],
    [20,30,5,6,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'blocked');
  assert.match(r.measurement.reason, /contour.*red|red.*contour/i);
  assert.equal(r.debug.quality.status, 'blocked');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1430);
  assert.equal(r.debug.mask[32*100+25], 1);
  assert.equal(r.debug.mask[32*100+40], 1);
  assert.equal(r.qualification.status, 'blocked');
});

// Break caught: expanding the adjacency search across an unselected gap
// would falsely reject a detached route next to a complete building.
test('candidate does not treat detached red support as contour-connected ambiguity', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [20,30,5,6,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'observed');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1400);
  assert.equal(r.qualification.status, 'blocked');
});

// Break caught: inspecting unfilled color support instead of the outer filled
// contour would misclassify an enclosed logo as a connected external rail.
test('candidate ambiguity handling preserves an enclosed red logo interior', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [40,30,8,8,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'observed');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1400);
  assert.equal(r.foregroundEvidence.filledInteriorPixels, 64);
  assert.equal(r.debug.mask[33*100+43], 1);
});

// Break caught: reporting observed geometry for an ROI-clipped connected
// endpoint invents full-subject separation. Its shaft and endpoint must remain
// diagnostic support until a validated rule can assign their roles.
test('candidate blocks clipped endpoint separation while retaining shaft support', () => {
  const r = separateNeutral(neutralFixture([
    [24,20,40,35,[219,224,226]],
    [7,30,17,15,[244,253,255]],
  ]));
  assert.equal(r.measurement.status, 'blocked');
  assert.match(r.measurement.reason, /boundary|separation/i);
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1610);
  assert.equal(r.debug.mask[35*100+40], 1);
  assert.equal(r.debug.mask[35*100+10], 1);
  assert.equal(r.foregroundEvidence?.boundarySeparation?.status, 'blocked');
  assert.equal(r.foregroundEvidence?.boundarySeparation?.externalContinuationPixels, 15);
  assert.equal(r.qualification.status, 'blocked');
});

