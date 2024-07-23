/**
 * autocomplete
 */

import keys from "./keys.ts";
import { hide, show, empty, ancestor, getItem, setItem } from "./utils";

const css = {
  input: "form-input__input",
  hidden: "autocomplete__hidden",
  suggestions: "form-input__results",
  suggestionsActive: "form-input__results--active",
  link: "form-input__results__item",
  linkActive: "form-input__results__item--active",
  highlight: "autocomplete__highlight",
  empty: "autocomplete__empty",
  error: "autocomplete__error",
  loading: "form-input--loading",
  clear: "form-input__clear",
  clearActive: "form-input__clear--active",
  title: "autocomplete__title",
};

export default class Autocomplete {
  el: any;
  url: string;
  minimumLength: number;
  els: any;
  labelKey: any;
  idKey: any;
  cache: any;
  reorder: any;
  disableFilter: any;
  skipClearFocus: any;
  selectedIndex: any;
  savedInput: any;
  isOpen: any;
  isLoading: any;
  isError: any;
  xhr: any;
  results: any
  labels: any
  filteredResults: any;
  cachedResults: any;
  isEmpty: any;
  currentSearch: any;
  currentPrefix: any;
  xhrCounter: any;
  cachedId: any;
  cachedLabel: any;
  cachedOther: any;
  cachedType: any;
  total: any;
  firstRun: any;
  timeout: any;
  // history: any;
  action: any;

  constructor(ops) {
    this.el = ops.el;

    this.url = this.el.dataset.url;

    this.minimumLength = ops.minimumLength || 2;
    this.labelKey = ops.labelKey || "label";
    this.idKey = ops.idKey || "id";
    this.cache = ops.cache || false;
    this.reorder = ops.reorder || false;
    this.disableFilter = ops.disableFilter || false;
    this.skipClearFocus = ops.skipClearFocus;

    this.selectedIndex = 0;
    this.savedInput = "";
    this.isOpen = false;
    this.isLoading = false;
    this.isError = false;
    this.xhr = null;

    this.results = [];
    this.filteredResults = [];
    this.cachedResults = [];
    this.isEmpty = true;
    this.currentSearch = '';
    this.currentPrefix = '';
    this.xhrCounter = 0;
    this.cachedId = null;
    this.cachedLabel = '';
    this.cachedOther = '';
    this.cachedType = '';
    this.total = 0;
    this.firstRun = true;
    this.timeout = '';

    this.els = {
      input: this.el.querySelector(`.${css.input}`),
      hidden: this.el.querySelector(`.${css.hidden}`),
      suggestions: this.el.querySelector(`.${css.suggestions}`),
      clear: this.el.querySelector(`.${css.clear}`),
      suggested: this.el.querySelectorAll(`.${css.link}`),
      title: this.el.querySelector(`.${css.title}`)
    };

    this.labels = {
      empty: "No results msg",
      error: "Error msg"
    };

    // this.history = this.el.getAttribute('data-history');
    this.action = ops.action;

    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleSuggestionClick = this.handleSuggestionClick.bind(this);

    // reset this value as ie/edge retain it sometimes
    this.els.input.value = '';
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
    this.els.suggestions
      .querySelectorAll(`.${css.link}`)
      .forEach(el => el.addEventListener('click', this.handleSuggestionClick));
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

  handleClear(e) {
    // this.cachedId = null;
    // this.cachedLabel = null;
    // this.cachedOther = null;
    // this.cachedType = null;
    // this.clearId();

    this.unlock();
    this.els.input.value = "";
    this.els.input.focus();
  }

  getInput() {
    return this.els.input.value.trim();
  }

  handleSuggestionClick(e) {
    e.preventDefault();

    const link = e.currentTarget;
    const label = link.dataset.label;
    const id = link.dataset.id;
    const other = link.dataset.other;
    const type = link.dataset.type;

    this.setId(id, label, other, type);
    this.setSuggestion(link);
    this.hideSuggestions();
  }

  setId(id, label, other, type) {
    if (id !== null) {
      this.els.input.setAttribute('data-id', ''); // Needed for IE - dataset assignment polyfill only works if the attribute exists already
      this.els.input.dataset.id = id;

      // to hide validation on input after suggestion click
      this.els.input.classList.remove('form-input--error');
      const inputId = this.els.input.getAttribute('id');
      const errorLabel = document.getElementById(`${inputId}_error`);

      if (errorLabel) {
        errorLabel.classList.remove('form-label--error--active');
      }

      // if we have a custom action, fire it
      if (typeof this.action === 'function') {
        this.action({
          id,
          label,
          type,
          other
        });

        this.lock();
      } else {
        if (this.skipClearFocus) {
          this.lock();
          // this.setFocus();
        }
      }

      // this.addHistroy(id, label, other);
    }
  }

  /*
    add selected item to local storage key if set 
  */
  // addHistroy(id, label, other) {
  //   if (this.history) {
  //     let currentHistory = getItem(this.history) || [];
  //     let exists = false;
  //     let original = id.toString();

  //     currentHistory.forEach(el => {
  //       if (original.trim() === el.id.trim()) {
  //         exists = true;
  //       }
  //     });

  //     if (!exists) {
  //       currentHistory.unshift({
  //         id,
  //         label,
  //         other
  //       });

  //       setItem(this.history, currentHistory);
  //     }
  //   }
  // }

  // setFocus() {
  //   const form = ancestor(this.el, 'form');
  //   let el = this.el;
  //   let submit = null;

  //   while (el !== form && !submit) {
  //     submit = el.parentNode.querySelector('[type="submit"]');
  //     el = el.parentNode;
  //   }

  //   if (form) {
  //     const formGroups = form.querySelectorAll('.form-group');
  //     let siblingInput = null;
  //     Array.prototype.forEach.call(formGroups, el => {
  //       const match = el !== this.el.parentNode ? el : null;

  //       if (match && match.classList.contains('form-group')) {
  //         siblingInput = match.querySelector('input');
  //       }
  //     });

  //     if (submit) {
  //       submit.focus();
  //     }

  //     if (siblingInput) {
  //       const isSiblingInputCompleted = siblingInput.getAttribute('data-id');

  //       if (!isSiblingInputCompleted) {
  //         siblingInput.focus();
  //         return;
  //       }
  //     }
  //   }
  // }

  clearId() {
    this.els.input.removeAttribute('data-id');
  }

  setSuggestion(link) {
    const label = link.dataset.label;
    this.els.input.value = unescape(label);
    this.els.input.refresh();
  }

  showSuggestions() {
    this.selectedIndex = 0;
    show(this.els.suggestions);
    this.els.suggestions.classList.add(css.suggestionsActive);
    this.els.suggestions.setAttribute('aria-hidden', false);
    this.isOpen = true;
    this.bindOutsideClick();
  }

  hideSuggestions() {
    this.removeOutsideClick();

    this.cachedId = null;
    this.cachedLabel = null;

    this.selectedIndex = 0;
    this.els.suggestions.scrollTop = 0;
    hide(this.els.suggestions);
    empty(this.els.suggestions);
    this.els.suggestions.classList.remove(css.suggestionsActive);
    this.els.suggestions.setAttribute('aria-hidden', true);
    this.isOpen = false;
  }

  lookup() {
    const query = this.getInput();

    if (query.length >= this.minimumLength) {
      this.startLoading();

      const options = {
        method: 'get',
        url: this.url.replace('{value}', query),
        headers: {
          Accept: 'application/json'
        }
      };

      fetch(options.url, options)
        .then(response => {
          if (response.status > 200) {
            throw new Error();
          }

          return response.json();
        })
        .then(response => {
          
          
          this.results = response.results;
          // this.cachedResults = response.data ? response.data : response;
          this.total = this.results.length;
          this.stopLoading();
          this.render();
          this.isError = false;
          this.firstRun = false;
        })
        .catch(error => {
          this.handleError(error);
        });
    } else {
      this.stopLoading();
      this.resetResults();
      this.hideSuggestions();
    }
  }

  // handleFilter() {
  //   const query = this.getInput();

  //   this.filteredResults = this.filterResults(
  //     this.results,
  //     query.toLowerCase()
  //   );

  //   this.total = this.filteredResults.length;
  //   this.render();
  // }

  handleError(error) {
    this.stopLoading();
    this.isError = true;
    this.render();
    console.dir(error);
  }

  handleResponse(response) {
    return response.data;
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
    this.isEmpty = this.filteredResults.length === 0;

    if (!this.isEmpty && !this.isError) {
      this.renderResults();
    } else {
      if (!this.isLoading && this.isEmpty) {
        this.renderNoResults();
      }
      if (!this.isLoading && this.isError) {
        this.renderError();
      }
    }
  }

  renderNoResults() {
    const html = `<div class="${css.empty}">
      <small>
        ${this.labels.empty}
      </small>
    </div>`;

    this.els.suggestions.innerHTML = html;
    this.showSuggestions();
  }

  renderError() {
    const html = `<div class='${css.error}'>
      <small>
        ${this.labels.error}
      </small>
    </div>`;

    this.els.suggestions.innerHTML = html;
    this.showSuggestions();
  }

  resultTemplate(data) {
    return `<a href="#" class="${data.css.link}" data-id="${data.id
      }" data-label="${escape(data.label)}" data->
      <div class="typeahead__suggestions__line--1">
        ${data.highlightedLabel} ${data.region}
      </div>
      <div class="typeahead__suggestions__line--2">
        ${data.country}
      </div>
    </a>`;
  }

  renderResults() {
    let html = '';
    let query = this.getInput();

    this.filteredResults.forEach(item => {
      const id = item[this.idKey];
      const port = item[this.labelKey];
      const label = port;
      const country = item.countryName;
      const highlightedLabel = this.highlight(port, query);
      const region = item.regionName ? `(${item.regionName})` : '';

      html += this.resultTemplate({
        css,
        label,
        id,
        highlightedLabel,
        country,
        region
      });
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

      // issues with this in ie11 + edge
      // activeLink.scrollIntoView({
      //   block: 'nearest'
      // });
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

    this.cachedId = selected.dataset.id;
    this.cachedLabel = selected.dataset.label;
    this.cachedOther = selected.dataset.other;
    this.cachedType = selected.dataset.type;

    this.setSuggestion(selected);
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
        if (this.cachedId !== null) {
          this.removeOutsideClick();
          this.setId(this.cachedId, this.cachedLabel, this.cachedOther, this.cachedType);
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
    this.results = [];
    this.filteredResults = [];
    this.currentPrefix = '';
    this.total = 0;
  }

  decision() {
    this.lookup();

    // if (this.getInput().length > 0) {
    //   this.lookup();
    // } else {
    //   this.savedInput = '';
    //   if (this.history && getItem(this.history)) {
    //     this.showHistory();
    //   } else if (this.els.suggested.length > 0) {
    //     this.showPopular();
    //   } else {
    //     this.hideSuggestions();
    //   }
    // }
  }

  // showPopular() {
  //   let html = '';

  //   if (this.els.title) {
  //     html += `<div class="typeahead__title">${this.els.title.innerText}</div>`;
  //   }

  //   this.total = this.els.suggested.length;

  //   this.els.suggested.forEach(item => {
  //     const label = item.getAttribute('data-label');
  //     const id = item.getAttribute('data-id');
  //     const type = item.getAttribute('data-type');

  //     html += `<a href="#" class="${css.link
  //       }" data-id="${id}" data-label="${label}" data-type="${type}">
  //       <div class="typeahead__suggestions__line--1">
  //         ${label}
  //       </div>
  //     </a>`;
  //   });

  //   this.els.suggestions.innerHTML = html;
  //   this.isEmpty = false;

  //   this.bindSuggestions();
  //   this.showSuggestions();
  // }

  // showHistory() {
  //   let html = `<div class="typeahead__title">${this.el.getAttribute(
  //     'data-history-title'
  //   )}</div>`;
  //   const history = getItem(this.history).slice(0, 5);

  //   this.total = history.length;

  //   history.forEach(item => {
  //     html += `<a href="#" class="${css.link}" data-id="${item.id
  //       }" data-label="${item.label}">
  //       <div class="typeahead__suggestions__line--1">
  //         ${unescape(item.label)}
  //       </div>
  //     </a>`;
  //   });

  //   this.postShowHistory(html);
  // }

  // postShowHistory(html) {
  //   this.els.suggestions.innerHTML = html;
  //   this.isEmpty = false;

  //   this.bindSuggestions();
  //   this.showSuggestions();
  // }
}
