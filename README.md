# szn-select-UI

UI for the accessible HTML selectbox with customizable UI: szn-select.

This element is not meant to be used on its own; it is meant to be used by the
`szn-select` custom element.

## Usage

Create an empty `szn-select-ui` element, the element is configured entirely by
its JavaScript API.

```html
<szn-select-ui></szn-select-ui>
```

The element must be linked to the `select` element it is to represent:

```js
selectButton.setSelectElement(selectElement)
```
