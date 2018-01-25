'use strict'
;(global => {
  const SznElements = global.SznElements = global.SznElements || {}

  const CSS_STYLES = `
%{CSS_STYLES}%
  `
  const CSS_STYLES_TAG = 'data-styles--szn-select-ui'

  const MIN_BOTTOM_SPACE = 160 // px
  const INTERACTION_DOM_EVENTS = ['mousedown', 'click', 'touchstart']
  const RESIZE_RELATED_DOM_EVENTS = ['resize', 'scroll', 'wheel', 'touchmove']

  let stylesInjected = false

  SznElements['szn-select-ui'] = class SznSelectUi {
    constructor(rootElement, uiContainer) {
      if (!rootElement.hasOwnProperty('minBottomSpace')) {
        Object.defineProperty(rootElement, 'minBottomSpace', {
          get: () => rootElement._broker._minBottomSpace,
          set: value => {
            rootElement._broker._minBottomSpace = value
            if (rootElement._broker._dropdown && rootElement._broker._dropdown._broker) {
              rootElement._broker._dropdown.minBottomSpace = value
            }
          },
        })
      }

      rootElement.setSelectElement = this.setSelectElement.bind(this)
      rootElement.setFocus = this.setFocus.bind(this)
      rootElement.setOpen = this.setOpen.bind(this)
      rootElement.onUiInteracted = rootElement.onUiInteracted || null

      this._root = rootElement
      this._select = null
      this._button = null
      this._dropdown = null
      this._dropdownPosition = null
      this._dropdownContent = SznElements.buildDom('<szn- data-szn-select-dropdown data-szn-tethered-content></szn->')
      this._dropdownOptions = null
      this._dropdownContainer = document.body
      this._minBottomSpace = MIN_BOTTOM_SPACE
      this._observer = new MutationObserver(onDomMutated.bind(this))

      this._onDropdownPositionChange = onDropdownPositionChange.bind(null, this)
      this._onDropdownSizeUpdateNeeded = onDropdownSizeUpdateNeeded.bind(null, this)
      this._onUiInteracted = onUiInteracted.bind(null, this)

      if (!stylesInjected) {
        const stylesContainer = document.createElement('style')
        stylesContainer.innerHTML = CSS_STYLES
        stylesContainer.setAttribute(CSS_STYLES_TAG, '')
        document.head.appendChild(stylesContainer)
        stylesInjected = true
      }
    }

    onMount() {
      addEventListeners(this)
      this._observer.observe(this._root, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeFilter: ['disabled', 'multiple', 'selected'],
      })
    }

    onUnmount() {
      if (this._dropdown) {
        this._dropdown.parentNode.removeChild(this._dropdown)
      }

      removeEventListeners(this)
      this._observer.disconnect()
    }

    setSelectElement(select) {
      this._select = select

      createUI(this)
    }

    setOpen(isOpen) {
      if (this._select.multiple || this._select.disabled) {
        return
      }

      if (isOpen) {
        if (this._button._broker) {
          this._button.setOpen(true)
        }
        this._dropdownContainer.appendChild(this._dropdown)

        let dropdownReady = false
        let optionsReady = false
        SznElements.awaitElementReady(this._dropdown, () => {
          dropdownReady = true
          if (optionsReady) {
            initDropdown(this, this._dropdown, this._dropdownOptions)
          }
        })
        SznElements.awaitElementReady(this._dropdownOptions, () => {
          optionsReady = true
          if (dropdownReady) {
            initDropdown(this, this._dropdown, this._dropdownOptions)
          }
        })
      } else {
        if (!this._dropdown.parentNode) {
          return
        }

        if (this._button._broker) {
          this._button.setOpen(false)
        }
        this._dropdown.parentNode.removeChild(this._dropdown)
      }
    }

    setFocus(hasFocus) {
      if (hasFocus) {
        this._root.setAttribute('data-szn-select-active', '')
      } else {
        this._root.removeAttribute('data-szn-select-active')
      }
    }
  }

  function addEventListeners(instance) {
    for (const eventType of INTERACTION_DOM_EVENTS) {
      instance._root.addEventListener(eventType, instance._onUiInteracted)
      instance._dropdownContent.addEventListener(eventType, instance._onUiInteracted)
    }
    for (const eventType of RESIZE_RELATED_DOM_EVENTS) {
      addEventListener(eventType, instance._onDropdownSizeUpdateNeeded)
    }
  }

  function removeEventListeners(instance) {
    for (const eventType of INTERACTION_DOM_EVENTS) {
      instance._root.removeEventListener(eventType, instance._onUiInteracted)
      instance._dropdownContent.removeEventListener(eventType, instance._onUiInteracted)
    }
    for (const eventType of RESIZE_RELATED_DOM_EVENTS) {
      removeEventListener(eventType, instance._onDropdownSizeUpdateNeeded)
    }
  }

  function onUiInteracted(instance, event) {
    if (instance._root.onUiInteracted) {
      instance._root.onUiInteracted(event)
    }
  }

  function onDomMutated(instance) {
    // Since we are mutating our subtree, there will be false positives, so we always need to check what has changed

    const select = instance._select
    if (select && ((select.multiple && instance._button) || (!select.multiple && !instance._button))) {
      createUI(instance)
    }
  }

  function onDropdownSizeUpdateNeeded(instance) {
    if (!instance._dropdown || !instance._dropdown._broker || !instance._dropdownOptions._broker) {
      return
    }

    const contentHeight = instance._dropdownOptions.scrollHeight
    const dropdownStyle = getComputedStyle(instance._dropdownOptions)
    const maxHeight = (
      contentHeight + parseInt(dropdownStyle.borderTopWidth, 10) + parseInt(dropdownStyle.borderBottomWidth, 10)
    )
    const dropdownBounds = instance._dropdownContent.getBoundingClientRect()
    const isTopAligned = instance._dropdown.verticalAlignment === instance._dropdown.VERTICAL_ALIGN.TOP
    const viewportHeight = window.innerHeight

    const suggestedHeight = isTopAligned ?
      Math.min(maxHeight, dropdownBounds.bottom)
      :
      Math.min(maxHeight, viewportHeight - dropdownBounds.top)

    const currentHeight = dropdownBounds.height || dropdownBounds.bottom - dropdownBounds.top

    if (suggestedHeight !== currentHeight) {
      instance._dropdownContent.style.height = `${suggestedHeight}px`
    }
  }

  function onDropdownPositionChange(instance, verticalAlignment) {
    const isOpenedAtTop = verticalAlignment === instance._dropdown.VERTICAL_ALIGN.TOP
    instance._dropdownPosition = verticalAlignment
    if (instance._button && instance._button._broker) {
      const {OPENING_POSITION} = instance._button
      instance._button.setOpeningPosition(isOpenedAtTop ? OPENING_POSITION.UP : OPENING_POSITION.DOWN)
    }
    onDropdownSizeUpdateNeeded(instance)
  }

  function createUI(instance) {
    clearUI(instance)

    if (!instance._select) {
      return
    }

    if (instance._select.multiple) {
      createMultiSelectUI(instance)
    } else {
      createSingleSelectUI(instance)
    }
  }

  function createSingleSelectUI(instance) {
    initSingleSelectButton(instance)

    instance._dropdownOptions = document.createElement('szn-options')
    instance._dropdown = document.createElement('szn-tethered')
    instance._dropdown.appendChild(instance._dropdownContent)
    instance._dropdownContent.appendChild(instance._dropdownOptions)
  }

  function initSingleSelectButton(instance) {
    const button = document.createElement('szn-select-button')
    SznElements.awaitElementReady(button, () => {
      if (instance._button !== button) {
        return
      }

      instance._button.setSelectElement(instance._select)
      if (instance._dropdown.parentNode) {
        instance._button.setOpen(true)
      }
      if (instance._dropdownPosition) {
        onDropdownPositionChange(instance, instance._dropdownPosition)
      }
    })

    instance._button = button
    instance._root.appendChild(button)
  }

  function initDropdown(instance, dropdown, options) {
    dropdown.setTether(instance._root)
    options.setOptions(instance._select)
    dropdown.minBottomSpace = instance._minBottomSpace
    dropdown.onVerticalAlignmentChange = instance._onDropdownPositionChange
    instance._onDropdownPositionChange(dropdown.verticalAlignment)
    onDropdownSizeUpdateNeeded(instance)
  }

  function createMultiSelectUI(instance) {
    const select = instance._select
    const options = document.createElement('szn-options')
    instance._root.appendChild(options)
    SznElements.awaitElementReady(options, () => options.setOptions(select))
  }

  function clearUI(instance) {
    instance._root.innerHTML = ''
    instance._dropdownContent.innerHTML = ''
    if (instance._dropdown && instance._dropdown.parentNode) {
      instance._dropdown.parentNode.removeChild(instance._dropdown)
    }
    instance._button = null
    instance._dropdown = null
    instance._dropdownPosition = null
    instance._dropdownOptions = null
  }

  if (SznElements.init) {
    SznElements.init()
  }
})(self)
