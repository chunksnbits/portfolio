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

function getBreakpointLowerBounds(breakpoint) {
  return breakpoints[breakpoint];
}

function getBreakpointUpperBounds(breakpoint) {
  const key = breakpointKeys[breakpointKeys.indexOf(breakpoint) + 1];
  return breakpoints[key];
}

export function getActiveBreakpoint() {
  const width = window.innerWidth;
  const [key] = Object.entries(breakpoints).find(([, value]) => width < value);

  return key;
}

export function isActiveBreakpoint(breakpoint) {
  const width = window.innerWidth;
  return width >= getBreakpointLowerBounds(breakpoint) &&
    width <= getBreakpointUpperBounds(breakpoint);
}

export function isBreakpointGreater(breakpoint) {
  return window.innerWidth > getBreakpointLowerBounds(breakpoint);
}
export function isBreakpointGreaterEquals(breakpoint) {
  return window.innerWidth >= getBreakpointLowerBounds(breakpoint);
}

export function isBreakpointSmaller(breakpoint) {
  return window.innerWidth < getBreakpointUpperBounds(breakpoint);
}

export function isBreakpointSmallerEquals(breakpoint) {
  return window.innerWidth <= getBreakpointUpperBounds(breakpoint);
}
