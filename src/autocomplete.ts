/**
 * autocomplete library class
 */

// lodash utilities for debouncing requests and going deep into objects with dot notation
import debounce from "lodash/debounce";
import get from "lodash/get";

// constants for keyboard buttons
import keys from "./keys.ts";

// common css classes
const css = {
  input: "form-input__input",
  suggestions: "form-input__results",
  suggestionsActive: "form-input__results--active",
  link: "form-input__results__item",
  linkActive: "form-input__results__item--active",
  highlight: "form-input__results__item__highlight",
  empty: "form-input__results__msg",
  error: "form-input__results__msg",
  loading: "form-input--loading",
  clear: "form-input__clear",
  clearActive: "form-input__clear--active",
  title: "form-input__results__title",
};

export default class Autocomplete {
  el: HTMLElement;
  url: string;
  minimumLength: number;
  els: any;
  titleKey: string;
  textKey: string;

  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;

  previousSearch: string;
  results: any
  total: number;
  selectedIndex: number;
  savedInput: string;
  labels: any
  options: any;

  constructor(ops) {
    this.options = ops;
    this.el = ops.el;
    this.url = ops.url;
    this.minimumLength = ops.minimumLength || 2;

    this.isOpen = false;
    this.isLoading = false;
    this.isError = false;
    this.isEmpty = true;

    this.previousSearch = "";
    this.results = [];
    this.selectedIndex = 0;
    this.savedInput = "";
    this.total = 0;

    // cached html elements
    this.els = {
      input: this.el.querySelector(`.${css.input}`),
      suggestions: this.el.querySelector(`.${css.suggestions}`),
      clear: this.el.querySelector(`.${css.clear}`),
      suggested: this.el.querySelectorAll(`.${css.link}`),
    };

    this.labels = {
      empty: "No results were found...",
      error: "There was an unexpected error..."
    };

    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleSuggestionClick = this.handleSuggestionClick.bind(this);

    //debounce the api request to prevent accessive calls
    this.getResults = debounce(this.getResults.bind(this), 300);
  }

  bind() {
    this.els.input.addEventListener('focus', this.handleFocus);
    this.els.input.addEventListener('keyup', this.handleKeyup);
    this.els.input.addEventListener('keydown', this.handleKeydown);
    this.els.clear.addEventListener('click', this.handleClear);
  }

  bindOutsideClick() {
    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('focusin', this.handleOutsideClick);
  }

  removeOutsideClick() {
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('focusin', this.handleOutsideClick);
  }

  bindSuggestions() {
    this.els.suggestions.querySelectorAll(`.${css.link}`).forEach(el => {
      el.addEventListener('click', this.handleSuggestionClick);
    });
  }

  lock() {
    this.els.input.setAttribute('disabled', 'disabled');
  }

  unlock() {
    this.els.input.removeAttribute('disabled');
  }

  handleOutsideClick(e) {
    let { target } = e;
    let closest = false;

    while (target) {
      if (target === this.el) {
        closest = true;
      }

      target = target.parentNode;
    }

    if (!closest) {
      if (this.isOpen) {
        this.revert();
      }
    }
  }

  handleClear() {
    this.unlock();
    this.els.input.value = "";
    this.els.input.focus();
    this.checkClear();
  }

  getInput() {
    return this.els.input.value.trim();
  }

  handleSuggestionClick(e) {
    e.preventDefault();

    const link = e.currentTarget;
    const id = link.getAttribute("data-id");

    this.selectedIndex = parseInt(id);
    this.setItem();
    this.hideSuggestions();
  }

  setItem() {
    const data = this.results[this.selectedIndex - 1];

    if (typeof this.options.onSelect === "function") {
      this.options.onSelect(data);
    }

    this.els.input.value = "";
    this.checkClear();
  }

  clearId() {
    this.els.input.removeAttribute('data-id');
  }

  setSuggestion() {
    this.els.input.value = get(this.results[this.selectedIndex - 1], this.options.titleKey, "Title error");
  }

  showSuggestions() {
    this.selectedIndex = 0;
    this.els.suggestions.classList.add(css.suggestionsActive);
    this.els.suggestions.setAttribute('aria-hidden', false);
    this.isOpen = true;

    this.bindOutsideClick();
  }

  hideSuggestions() {
    this.removeOutsideClick();

    this.selectedIndex = 0;
    this.els.suggestions.scrollTop = 0;
    this.els.suggestions.classList.remove(css.suggestionsActive);
    this.els.suggestions.innerHTML = "";
    this.els.suggestions.setAttribute('aria-hidden', true);

    this.isOpen = false;
  }

  getResults(query) {
    this.startLoading();
    this.isError = false;

    const options = {
      method: 'get',
      url: this.url.replace('{value}', query),
      headers: {
        Accept: 'application/json'
      }
    };

    fetch(options.url, options)
      .then(response => {
        if (response.status === 404) {
          throw new Error(this.labels.empty);
        }
        if (response.status > 200) {
          throw new Error(this.labels.error);
        }

        return response.json();
      })
      .then(response => {
        if (typeof this.options.handleResponse === "function") {
          this.results = this.options.handleResponse(response);
        }
        else {
          this.results = response.results;
        }

        this.previousSearch = query;
        this.total = this.results.length;
        this.stopLoading();
        this.render();
      })
      .catch(error => {
        this.handleError(error);
      });

  }

  handleError(error) {
    this.stopLoading();
    this.isError = true;
    this.renderError(error);
  }

  startLoading() {
    this.el.classList.add(css.loading);
    this.isLoading = true;
  }

  stopLoading() {
    this.el.classList.remove(css.loading);
    this.isLoading = false;
  }

  render() {
    this.isEmpty = this.results.length === 0;

    if (!this.isEmpty && !this.isError) {
      this.renderResults();
    } 
    else if (!this.isLoading && this.isEmpty) {
      this.renderError(this.els.empty);
    } 
    else if (!this.isLoading && this.isError) {
      this.renderError(this.els.error);
    }
  }

  renderError(msg) {
    const html = `<div class='${css.error}'>${msg}</div>`;

    this.els.suggestions.innerHTML = html;
    this.showSuggestions();
  }

  resultTemplate(data) {
    return `<button data-id="${data.i + 1}" class="form-input__results__item">
      ${data.title}${data.text ? ` - <em>${data.text}` : ""}</em>
    </button>`;
  }

  renderResults() {
    const query = this.getInput();
    let html = `<div class="${css.title}">Suggestions</div>`;

    this.results.forEach((item, i) => {
      const title = get(item, this.options.titleKey, "Title error");
      const text = get(item, this.options.textKey, "Text error");

      html += this.resultTemplate({
        i,
        title: this.highlight(title, query),
        text
      })
    });

    this.els.suggestions.innerHTML = html;
    this.bindSuggestions();
    this.showSuggestions();
  }

  replacer(match) {
    return `<span class="${css.highlight}">${match}</span>`;
  }

  highlight(title, search) {
    // escape parentheses and other special characters
    let word = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    let reg = new RegExp(word, 'gi');
    let highlighted = title.replace(reg, this.replacer);

    return highlighted;
  }

  next() {
    this.selectedIndex += 1;
    this.updateScroll();

    if (this.selectedIndex > this.total) {
      this.revert();
      return;
    }

    this.updateSelected();
  }

  previous() {
    this.selectedIndex -= 1;
    this.updateScroll();

    if (this.selectedIndex < 1) {
      this.revert();
      return;
    }

    this.updateSelected();
  }

  updateScroll() {
    const activeLink = this.els.suggestions.querySelector(
      `.${css.link}:nth-child(${this.selectedIndex})`
    );

    if (activeLink) {
      this.els.suggestions.scrollTop = activeLink.offsetTop;
      activeLink.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }

  updateSelected() {
    this.els.suggestions
      .querySelectorAll(`.${css.link}`)
      .forEach(el => el.classList.remove(css.linkActive));

    const selected = this.els.suggestions.querySelectorAll(`.${css.link}`)[
      this.selectedIndex - 1
    ];

    selected.classList.add(css.linkActive);
    this.setSuggestion();
  }

  revert() {
    this.els.input.value = this.savedInput;
    this.hideSuggestions();
  }

  handleKeydown(e) {
    if (
      e.keyCode === keys.enter &&
      this.els.suggestions.classList.contains(`${css.suggestionsActive}`)
    ) {
      e.preventDefault();
    }
    if (
      e.keyCode === keys.up ||
      e.keyCode === keys.down ||
      e.keyCode === keys.enter
    ) {
      return false;
    }
  }

  handleKeyup(e) {
    this.checkClear();

    if (e.keyCode === keys.up) {
      this.previous();
      return false;
    }

    if (this.isOpen && !this.isEmpty) {
      if (e.keyCode === keys.escape) {
        this.revert();
        return false;
      }
      if (e.keyCode === keys.down) {
        this.next();
        return false;
      }
      if (e.keyCode === keys.enter) {
        if (this.selectedIndex !== 0) {
          this.setItem();
          this.removeOutsideClick();
          this.hideSuggestions();
        }

        return false;
      }
    }

    this.savedInput = e.target.value;
    this.decision();
  }

  handleFocus() {
    this.decision();
  }

  checkClear() {
    if (this.els.input.value.length > 0) {
      this.els.clear.classList.add(css.clearActive);
    }
    else {
      this.els.clear.classList.remove(css.clearActive);
    }
  }

  resetResults() {
    this.previousSearch = "";
    this.results = [];
    this.total = 0;
  }

  decision() {
    const query = this.getInput();

    if (query.length >= this.minimumLength) {
      // only make a call if the query is different
      if(query !== this.previousSearch) {
        this.getResults(query);
      }
      else {
        this.render();
      }

    } else {
      this.stopLoading();
      this.resetResults();
      this.hideSuggestions();
    }
  }
}
