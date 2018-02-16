# szn-select-ui

UI for the accessible HTML selectbox with customizable UI: szn-select.

This element is not meant to be used on its own; it is meant to be used by the
`szn-select` custom element.

---

This project has been re-integrated into the
[szn-select](https://github.com/jurca/szn-select) element. This repository is
no longer up-to-date.

---

## Usage

Create an empty `szn-select-ui` element, the element is configured entirely by
its JavaScript API.

```html
<szn-select-ui></szn-select-ui>
```

The element must be linked to the `select` element it is to represent:

```js
selectUi.setSelectElement(selectElement)
```
