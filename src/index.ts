import "./main.scss";
import Autocomplete from "./autocomplete";

const autocomplete = document.querySelectorAll<HTMLElement>(`.autocomplete`);
const forms = document.querySelectorAll<HTMLElement>(`form`);
const tags = document.querySelector<HTMLElement>(`.tags`);
const remove = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M23.954 21.03l-9.184-9.095 9.092-9.174-2.832-2.807-9.09 9.179-9.176-9.088-2.81 2.81 9.186 9.105-9.095 9.184 2.81 2.81 9.112-9.192 9.18 9.1z"/></svg>`;

forms.forEach(form => {
  form.addEventListener("submit", e => {
    e.preventDefault();
  })
})

autocomplete.forEach(el => {
  const options = {
    el,
    url: "https://restcountries.com/v3.1/name/{value}",
    handleResponse: (response) => {
      return response;
    },
    onSelect: (data) => {
      if(tags) {
        tags.innerHTML = tags.innerHTML += `<button class="tag" onClick="this.parentNode.removeChild(this)">${data.name.common} ${remove}</button>`
      }
    },
    titleKey: "name.common",
    textKey: "region"
  };
  const ac = new Autocomplete(options)

  ac.bind();
})
