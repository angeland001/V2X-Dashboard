export function getPhaseInfo(n, spatData) {
  if (!spatData) return { signal: "inactive", countdown: null, ped: null, protectedArrow: false };

  const reds    = spatData.phaseStatusGroupReds    ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const greens  = spatData.phaseStatusGroupGreens  ?? [];
  const walks      = spatData.phaseStatusGroupWalks      ?? [];
  const pedClears  = spatData.phaseStatusGroupPedClears  ?? [];
  const dontWalks  = spatData.phaseStatusGroupDontWalks  ?? [];
  const overlapReds = spatData.overlapStatusGroupReds ?? [];
  const overlapYellows = spatData.overlapStatusGroupYellows ?? [];
  const overlapGreens = spatData.overlapStatusGroupGreens ?? [];

  let signal = "inactive";
  if (greens.includes(n))  signal = "green";
  else if (yellows.includes(n)) signal = "yellow";
  else if (reds.includes(n))    signal = "red";

  let protectedArrow = "inactive";
  if (overlapGreens.includes(n)) protectedArrow = "green";
  else if (overlapYellows.includes(n)) protectedArrow = "yellow";
  else if (overlapReds.includes(n)) protectedArrow = "red";

  const countdown = spatData[`spatVehMinTimeToChange${n}`] || null;

  let ped = null;
  if (walks.includes(n))     ped = "walk";
  else if (pedClears.includes(n))  ped = "clear";
  else if (dontWalks.includes(n))  ped = "dontWalk";

  return { signal, countdown, ped, protectedArrow };
}

export function getOverallSignalState(spatData) {
  if (!spatData) return "inactive";
  const greens  = spatData.phaseStatusGroupGreens  ?? [];
  const yellows = spatData.phaseStatusGroupYellows ?? [];
  const reds    = spatData.phaseStatusGroupReds    ?? [];

  if (greens.length > 0) return "green";
  if (yellows.length > 0) return "yellow";
  if (reds.length > 0) return "red";
  return "inactive";
}
