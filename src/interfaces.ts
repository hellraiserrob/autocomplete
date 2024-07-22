export interface Options {
  el: HTMLElement,
  grid: Grid[],
  showPager?: Boolean
}

export interface Grid {
  width: number,
  items: number
}
