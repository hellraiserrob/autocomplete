import "./main.scss";


import Autocomplete from "./autocomplete";
const autocomplete = document.querySelectorAll<HTMLElement>(`.autocomplete`);

autocomplete.forEach(el => {
  const options = {
    el,
  };
  const ac = new Autocomplete(options)

  ac.bind();
})
