# Command File

The command file must be formatted as [YAML](https://en.wikipedia.org/wiki/YAML). If you're not familiar with the format, the CloudBees blog has a [nice intro to YAML](https://rollout.io/blog/yaml-tutorial-everything-you-need-get-started/), and [TutorialsPoint.com has tutorials](https://www.tutorialspoint.com/yaml/yaml_basics.htm) too.

## Example

Here is an example of what a command file might look like:

```yaml
# Go to example.com
- command: go
  url: https://example.com
# Find all articles and save their URLs into "articles"
- command: getAll
  selector: '#articles a'
  property: href
  saveAs: articles
# Perform actions for each item in "articles"
- command: each
  from: articles
  actions:
    # Go to that article URL
    - command: go
      url: '{{this}}'
    # Check if the body of the webpage contain the text "Login"
    - command: if
      selector: body
      test: contains
      value: Login
      # If it does, perform the following actions
      actions:
        # Type an email address into the "username" field
        - command: input
          selector: 'input[name="username"]'
          value: 'me@example.com'
        # Type a password into the "password" field
        - command: input
          selector: 'input[name="password"]'
          value: 'mypassword'
        # Click on the "submit" element
        - command: click
          selector: 'input[type="submit"]'
        # Wait for the page to finish loading
        - command: waitForPage
    # Scrape the text inside the "article" element for the TTS tool
    - command: scrape
      selector: '#article'
```

The YAML should consist of a sequence of commands (denoted by the `-` syntax). Comments begin with a `#` character and are ignored.

The "selector" syntax used for finding webpage elements is the same as used with CSS selectors and other web programming. See the [MDN docs on CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) for a more info.

## Command Reference

Each command in the sequence must have a `command` field with one of the following values.

### `click`

Required fields: `selector`

Clicks on the first element matching `selector`.

Note that if this causes the page to navigate somewhere else, `waitForPage` should be called immediately afterwards.

### `each`

Required fields: `actions`, `from`

Performs a sequence of commands (`actions`) for every item in the named `from` collection.

Note: Any of the given `actions` can contain the text `{{this}}`, which will be replaced by the current `from` value.

### `getAll`

Required fields: `property`, `saveAs`, `selector`

Finds all elements matching `selector`, grabs the value from the `property` of those elements, and saves them in a collection named with `saveAs`.

### `getOne`

Required fields: `property`, `saveAs`, `selector`

Finds the first element matching `selector`, grabs the value from the `property` of that element, and save it in a variable named with `saveAs`.

### `go`

Required fields: `url`

Opens the webpage at the given URL.

Note that `watiForPage` is _not_ needed with this command.

### `if`

Required fields: `actions`, `selector`, `test`, `value`
Optional fields: `negate`

Runs a check (`test`) against the first element matching `selector`. If so, perform the sequence of given `actions`. You can set `negate: true` to run the actions if the test does _not_ pass (i.e. is not true).

Currently supported `test`s:

* `contains` -- Does the element contain text matching the given `value`?

### `input`

Required fields: `selector`, `value`

Types the given `value` into the first element matching `selector`.

### `scrape`

Required fields: `selector`

Gathers the text content from the first element matching `selector`, and formats it for the TTS tool.

### `waitForPage`

Waits for the page to finish navigating. It should be used if the page has changed through actions (e.g. clicking a link or submitting a form).
