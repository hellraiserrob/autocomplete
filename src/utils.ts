export function getViewportHeight(): number {
  return window.innerHeight || document.documentElement.clientHeight;
}

export function getViewportWidth(): number {
  return window.innerWidth || document.documentElement.clientWidth;
}

export const getElementWidth = el => {
  return el.offsetWidth;
};

export function show(el) {
  el.style.display = 'block';
  el.style.opacity = 1;
}

export function hide(el) {
  el.style.display = 'none';
  el.style.opacity = 0;
}

export const empty = node => {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
};

/*
 * A function to search for a given element's ancestor,
 * optionally conditioned by a selector
 *
 * @param {object} element - An HTML Node
 * @param {string} selector - A CSS class or node selector
 */

export const ancestor = (element, selector = '') => {
	let match = null;
	let className = null;
	const type = selector.slice(0, 1);

	switch (type) {
		// TODO: extend with logic for selecting by attribute
		case '.':
			className = selector.slice(1);
			match = element;
			// The selector is a class, look form class names
			while (match !== document && !match.classList.contains(className)) {
				match = match.parentNode;
			}

			break;
		case '':
			// The selector was not provided, return parent
			match = element.parentNode;
			break;
		default:
			match = element;
			// Assume selector is a tag name as slice will return a random letter
			while (match !== document && match.tagName !== selector.toUpperCase()) {
				match = match.parentNode;
			}
			break;
	}

	return match === document ? null : match;
};

export function setItem(key, data) {
  if (typeof Storage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export function getItem(key) {
  return typeof Storage !== 'undefined'
    ? JSON.parse(localStorage.getItem(key))
    : '';
}

export function removeItem(key) {
  if (typeof Storage !== 'undefined') {
    localStorage.removeItem(key);
  }
}
