
function parseBreakpointsFromCssVariables() {
  const variables = getComputedStyle(document.documentElement);

  // extended from https://stackoverflow.com/a/54851636
  return Array.from(document.styleSheets)
    .filter(sheet => sheet.href === null || sheet.href.startsWith(window.location.origin))
    .reduce((result, sheet) => ([
      ...result,
      ...Array.from(sheet.cssRules).reduce((def, rule) => {
        return rule.selectorText === ":root" ? [
          ...def,
          ...Array.from(rule.style).filter(name => name.startsWith("--root__breakpoint")),
        ] : def;
      }, [])
    ]), [])
    .reduce((result, key) => ({
      ...result,
      [key.replace('--root__breakpoint--', '')]: Number(variables.getPropertyValue(key).replace(/[a-zA-Z]+/, ''))
    }), {})
}

const breakpoints = parseBreakpointsFromCssVariables();
const breakpointKeys = Object.keys(breakpoints);

function breakpointLowerBounds(breakpoint) {
  return breakpoints[breakpoint];
}

function breakpointUpperBounds(breakpoint) {
  const key = breakpointKeys[breakpointKeys.indexOf(breakpoint) + 1];
  return breakpoints[key];
}

export function isActiveBreakpoint(breakpoint) {
  const width = window.innerWidth;
  return width >= breakpointLowerBounds(breakpoint) &&
    width <= breakpointUpperBounds(breakpoint);
}

export function breakpointGreater(breakpoint) {
  return breakpointUpperBounds(breakpoint) < window.innerWidth;
}
export function breakpointGreaterEquals(breakpoint) {
  return breakpointUpperBounds(breakpoint) <= window.innerWidth;
}

export function breakpointSmaller(breakpoint) {
  return breakpointLowerBounds(breakpoint) > window.innerWidth;
}

export function breakpointSmallerEquals(breakpoint) {
  return breakpointLowerBounds(breakpoint) >= window.innerWidth;
}
