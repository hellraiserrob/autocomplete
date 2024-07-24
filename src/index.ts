import "./main.scss";
import Autocomplete from "./autocomplete";

const autocomplete = document.querySelectorAll<HTMLElement>(`.autocomplete`);
const forms = document.querySelectorAll<HTMLElement>(`form`);
const tags = document.querySelector<HTMLElement>(`.tags`);

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
      // console.log(data);
      if(tags) {
        tags.innerHTML = tags.innerHTML += `<div class="tag">${data.name.common}</div>`
      }
    },
    titleKey: "name.common",
    textKey: "region"
  };
  const ac = new Autocomplete(options)

  ac.bind();
})
