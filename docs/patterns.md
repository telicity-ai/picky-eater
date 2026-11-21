# Pattern catalog

<!-- Generated from catalog/ by "npm run build". Edit the JSON files, not this page. -->

The layouts, controls and motions picky-eater offers as options, with the conditions under which each one
is the right choice. Researched from established UI/UX books and public design systems; every
entry names its sources. Agents read the same data with `picky-eater patterns`.

146 patterns, 50 decisions, 144 references.

## Contents

- [Decisions](#decisions)
- [Layouts](#layout)
- [Navigation](#navigation)
- [Inputs and form controls](#input)
- [Actions](#action)
- [Content](#content)
- [Feedback](#feedback)
- [Overlays](#overlay)
- [Motion](#motion)
- [References](#references)

## Decisions

A decision is a question that comes up again and again. Its candidates become the options of an area.

### Turn one thing on or off

<a id="on-off-setting"></a>

| Option | Pick it when |
|---|---|
| [Switch](#switch) | The change takes effect immediately, with no Save button |
| [Checkbox](#checkbox) | The change is saved together with a form |
| [Toggle button](#toggle-button) | The state belongs to the current item and sits in a toolbar, such as mute or favorite |

Sources: Alita Kendrick 2018, *Toggle-Switch Guidelines* (Toggle-Switch Guidelines); Apple, *Human Interface Guidelines* (Toggles); Heydon Pickering 2019, *Inclusive Components* (Toggle Buttons)

### Choose one of a few options

<a id="choose-one-of-few"></a>

| Option | Pick it when |
|---|---|
| [Radio group](#radio-group) | There are two to about five options inside a form and each should be read before choosing |
| [Segmented control](#segmented-control) | There are two to five short options and the choice applies at once, such as a view or unit |
| [Select](#select) | Space is too tight to show the options and a default suits most people |

Sources: Jakob Nielsen 2004, *Checkboxes vs. Radio Buttons* (Checkboxes vs. Radio Buttons); Anna Kaley 2020, *Listboxes vs. Dropdown Lists* (Listboxes vs. Dropdown Lists); Apple, *Human Interface Guidelines* (Segmented controls)

### Choose one of many options

<a id="choose-one-of-many"></a>

| Option | Pick it when |
|---|---|
| [Select](#select) | There are roughly 5 to 15 familiar options |
| [Combobox](#combobox) | There are more than about 15 options, or users know the name of what they want |
| [Radio group](#radio-group) | Every option must be visible and compared, and there is room for all of them |

Sources: Anna Kaley 2020, *Listboxes vs. Dropdown Lists* (Listboxes vs. Dropdown Lists); Lars Söderlund 2018, *Drop-Down Usability: When You Should (and Shouldn't) Use Them* (Drop-Down Usability); U.S. General Services Administration, *U.S. Web Design System (USWDS)* (Combo box)

### Choose several options

<a id="choose-several"></a>

| Option | Pick it when |
|---|---|
| [Checkbox group](#checkbox-group) | There are up to about ten options and all can be shown |
| [Tag input](#tag-input) | The list is long or users can add their own values |
| [Combobox](#combobox) | Only one value is needed after all, from a long list |

Sources: Jakob Nielsen 2004, *Checkboxes vs. Radio Buttons* (Checkboxes vs. Radio Buttons); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (List Builder); Government Digital Service, *GOV.UK Design System* (Checkboxes)

### Enter a date

<a id="enter-date"></a>

| Option | Pick it when |
|---|---|
| [Date text input](#date-text-input) | The user knows the date by heart or reads it from a document, such as a date of birth |
| [Date picker](#date-picker) | The date is chosen in relation to today, a weekday or availability, or it is a range |
| [Select](#select) | Only a handful of dates are possible, such as delivery slots |

Sources: Angie Li 2017, *Date-Input Form Fields: UX Design Guidelines* (Date-Input Form Fields: UX Design Guidelines); Government Digital Service, *GOV.UK Design System* (Ask users for dates)

### Enter a number

<a id="enter-number"></a>

| Option | Pick it when |
|---|---|
| [Text field](#text-field) | The value is exact, large or not a quantity, such as an amount or a reference number |
| [Number stepper](#number-stepper) | The value is a small count that is nudged up or down from a default |
| [Slider](#slider) | An approximate value in a bounded range is enough and its effect is visible while dragging |

Sources: Yuxuan (Tammy) Zhou 2018, *Design Guidelines for Input Steppers* (Design Guidelines for Input Steppers); Aurora Harley 2015, *Slider Design: Rules of Thumb* (Slider Design: Rules of Thumb); Government Digital Service, *GOV.UK Design System* (Text input)

### Guard a destructive action

<a id="confirm-destructive-action"></a>

| Option | Pick it when |
|---|---|
| [Undo instead of confirm](#undo) | The action can be reversed or delayed, and happens often |
| [Confirmation dialog](#confirmation-dialog) | The action cannot be undone and is rare enough for the question to be read |
| [Typed confirmation](#typed-confirmation) | The action destroys something large or shared and a mistake would be very costly |

Sources: Aza Raskin 2007, *Never Use a Warning When you Mean Undo* (Never Use a Warning When you Mean Undo); Jakob Nielsen 2018, *Confirmation Dialogs Can Prevent User Errors* (Confirmation Dialogs Can Prevent User Errors); GitLab, *Pajamas Design System* (Destructive actions)

### Tell the user that something succeeded

<a id="report-success"></a>

| Option | Pick it when |
|---|---|
| [Inline confirmation](#inline-confirmation) | One field or setting was saved in place and the user is looking at it |
| [Toast](#toast) | A routine action succeeded, nothing more is needed and the result is also visible in the page |
| [Banner](#banner) | The page reloaded or the result needs to stay visible, for example "Your changes are published" |
| [Confirmation page](#confirmation-page) | A transaction ended and the user needs a reference and next steps |

Sources: Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications); Government Digital Service, *GOV.UK Design System* (Confirmation pages); Adam Silver 2020, *The problem with toast messages and what to do instead* (The problem with toast messages and what to do instead)

### Show a form error

<a id="show-form-error"></a>

| Option | Pick it when |
|---|---|
| [Inline error message](#inline-error) | The problem belongs to one field; always show it there |
| [Error summary](#error-summary) | The form was submitted with errors that may be off screen; show it in addition to inline errors |
| [Banner](#banner) | The problem is not about a field, such as a failed payment or a lost connection |

Sources: Rachel Krause 2019, *10 Design Guidelines for Reporting Errors in Forms* (10 Design Guidelines for Reporting Errors in Forms); Government Digital Service, *GOV.UK Design System* (Error summary); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Error Identification)

### Decide when to validate a form

<a id="validation-timing"></a>

| Option | Pick it when |
|---|---|
| [Validate on leaving a field](#validate-on-blur) | The form is long and on one page, and fields have rules that can be checked on their own |
| [Validate on submit](#validate-on-submit) | The form is short, asks one thing per page, or its fields depend on each other |

Sources: Edward Scott 2024, *Usability Testing of Inline Form Validation* (Usability Testing of Inline Form Validation); Government Digital Service, *GOV.UK Design System* (Recover from validation errors); Adam Silver 2017, *The problem with live validation and what to do instead* (The problem with live validation and what to do instead)

### Place labels in a form

<a id="label-placement"></a>

| Option | Pick it when |
|---|---|
| [Label above field](#label-top) | Default: any form, any width, labels of any length |
| [Label beside field](#label-left) | A dense settings form on wide screens where users scan the labels and height is scarce |
| [Floating label](#label-floating) | A very short form in a design system that already provides floating labels, with no hint text needed |

Sources: Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Labels); Luke Wroblewski 2007, *Top, Right or Left Aligned Form Labels* (Top, Right or Left Aligned Form Labels); Katie Sherwin 2014, *Placeholders in Form Fields Are Harmful* (Placeholders in Form Fields Are Harmful)

### Mark required and optional fields

<a id="required-marking"></a>

| Option | Pick it when |
|---|---|
| [Mark required fields](#mark-required) | The form mixes required and optional fields and users expect the asterisk |
| [Mark optional fields](#mark-optional) | Nearly all fields are required, or the service follows GOV.UK style |

Sources: Raluca Budiu 2019, *Marking Required Fields in Forms* (Marking Required Fields in Forms); Edward Scott 2018, *E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly (Only 14% Do So)* (E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly); Government Digital Service, *GOV.UK Design System* (Question pages)

### Explain what a field needs

<a id="explain-a-field"></a>

| Option | Pick it when |
|---|---|
| [Hint text](#help-text) | Most users need the explanation; keep it visible under the label |
| [Disclosure](#disclosure) | Only some users need it and it runs to several lines |
| [Tooltip](#tooltip) | It only names an icon or shows a full value; never for instructions |

Sources: Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Help Text); Alita Kendrick 2019, *Tooltip Guidelines* (Tooltip Guidelines); Adam Silver 2019, *The problem with tooltips and what to do instead* (The problem with tooltips and what to do instead)

### Place the primary action of a form

<a id="form-primary-action"></a>

| Option | Pick it when |
|---|---|
| [Save button](#explicit-save) | The form fits a page: put the button after the last field, aligned with the fields |
| [Bottom action bar](#bottom-action-bar) | The screen is a phone or the page is long and the action must stay in reach |
| [Sticky save bar](#sticky-save-bar) | An existing record is edited on a long page and the user must see that changes are unsaved |

Sources: Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Actions); Luke Wroblewski 2011, *Mobile First* (Actions); Shopify, *Polaris* (Save bar)

### Save a settings page

<a id="save-settings"></a>

| Option | Pick it when |
|---|---|
| [Autosave](#autosave) | Each setting is independent and can apply at once |
| [Save button](#explicit-save) | Settings are validated together or have consequences, and the page is short |
| [Sticky save bar](#sticky-save-bar) | Settings are saved together and the page is long |

Sources: GitHub, *Primer Design System* (Saving); Alita Kendrick 2018, *Toggle-Switch Guidelines* (Toggle-Switch Guidelines); Shopify, *Polaris* (Save bar)

### Organize a long settings page

<a id="organize-settings"></a>

| Option | Pick it when |
|---|---|
| [Sidebar and content](#sidebar-content) | There are many groups of settings, each worth its own page |
| [Tabbed sections](#tabbed-sections) | There are two to about seven groups with short names that fit one row |
| [Long page with section navigation](#section-nav-page) | People search the page or move between nearby groups; keep everything on one page |
| [Accordion sections](#accordion-sections) | The screen is a phone, or most people change only one group per visit |

Sources: Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Settings Editor); Evan Sunwall 2024, *Tabs, Used Right* (Tabs, Used Right); Huei-Hsin Wang 2023, *Accordions on Desktop: When and How to Use* (Accordions on Desktop: When and How to Use)

### Organize a long content page

<a id="organize-long-content"></a>

| Option | Pick it when |
|---|---|
| [Table of contents](#table-of-contents) | The page has a few sections and a list of links at the top is enough |
| [Long page with section navigation](#section-nav-page) | The page is many screens long and people move between sections |
| [Accordion sections](#accordion-sections) | People need only one or two sections and the headings tell them which |
| [Tabbed sections](#tabbed-sections) | The sections are parallel views that are never read together |

Sources: Huei-Hsin Wang 2023, *Table of Contents: The Ultimate Design Guide* (Table of Contents: The Ultimate Design Guide); Huei-Hsin Wang 2023, *Accordions on Desktop: When and How to Use* (Accordions on Desktop: When and How to Use); Government Digital Service, *GOV.UK Design System* (Accordion)

### Lay out a landing page hero

<a id="landing-hero"></a>

| Option | Pick it when |
|---|---|
| [Centered hero](#hero-centered) | The headline is short and any visual is wide and can sit below the text |
| [Split hero](#hero-split) | A product image or a form deserves its own side, or the headline is long and reads better left-aligned |

Sources: Huei-Hsin Wang 2024, *Homepage Design: 5 Fundamental Principles* (Homepage Design: 5 Fundamental Principles); Adam Wathan 2018, *Refactoring UI* (Designing Text); Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (The Big Bang Theory of Web Design)

### Present product features on a landing page

<a id="feature-section"></a>

| Option | Pick it when |
|---|---|
| [Card grid](#card-grid) | There are three to nine features of equal importance, each a title and a line or two |
| [Bento grid](#bento-grid) | Features differ in importance and each has a small visual |
| [Alternating feature rows](#zigzag-rows) | There are three to five features, each needing a paragraph and an informative image |

Sources: Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Grid of Equals); Kim Flaherty 2017, *Zigzag Image–Text Layouts Make Scanning Less Efficient* (Zigzag Image–Text Layouts Make Scanning Less Efficient); Adam Wathan 2018, *Refactoring UI* (Hierarchy is Everything)

### Show a collection of items

<a id="show-a-collection"></a>

| Option | Pick it when |
|---|---|
| [Data table](#data-table) | Items have several attributes that are compared, sorted or scanned |
| [List row](#list-row) | Items are known by their text and there are many of them |
| [Card grid](#card-grid) | Items are browsed and each has an image or mixed content |
| [Thumbnail grid](#thumbnail-grid) | Items are recognized by how they look |

Sources: Page Laubheimer 2022, *Data Tables: Four Major User Tasks* (Data Tables: Four Major User Tasks); Page Laubheimer 2016, *Cards: UI-Component Definition* (Cards: UI-Component Definition); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Thumbnail Grid)

### Navigate a site on desktop

<a id="desktop-navigation"></a>

| Option | Pick it when |
|---|---|
| [Top navigation bar](#top-nav) | There are about two to seven top-level sections with short names |
| [Sidebar navigation](#sidebar-nav) | There are many sections or more than one level, as in applications and documentation |
| [Mega menu](#mega-menu) | A large site has many categories on two levels that are easier to choose from when seen together |

Sources: Kara Pernice 2016, *Hamburger Menus and Hidden Navigation Hurt UX Metrics* (Hamburger Menus and Hidden Navigation Hurt UX Metrics); Page Laubheimer 2021, *Left-Side Vertical Navigation on Desktop: Scalable, Responsive, and Easy to Scan* (Left-Side Vertical Navigation on Desktop); Angie Li 2017, *Mega Menus Work Well for Site Navigation* (Mega Menus Work Well for Site Navigation)

### Primary navigation on phones

<a id="phone-navigation"></a>

| Option | Pick it when |
|---|---|
| [Bottom tab bar](#bottom-tab-bar) | There are three to five main sections that people switch between often |
| [Navigation drawer](#nav-drawer) | There are more than five sections, or navigation is used rarely compared with content |

Sources: Raluca Budiu 2015, *Basic Patterns for Mobile Navigation* (Basic Patterns for Mobile Navigation); Google, *Material Design 3* (Navigation bar); Apple, *Human Interface Guidelines* (Tab bars)

### Page through a long list

<a id="page-through-list"></a>

| Option | Pick it when |
|---|---|
| [Pagination](#pagination) | People look for specific items, need to return to a position or need the footer |
| [Load-more button](#load-more) | People browse, and the footer and scroll position should stay under their control |
| [Infinite scroll](#infinite-scroll) | The content is an endless stream skimmed without a target, mostly on phones |

Sources: Tim Neusesser 2022, *Infinite Scrolling: When to Use It, When to Avoid It* (Infinite Scrolling: When to Use It, When to Avoid It); Jakob Nielsen 2013, *Users' Pagination Preferences and "View All"* (Users' Pagination Preferences and "View All"); Vitaly Friedman 2022, *Infinite Scroll UX Done Right: Guidelines and Best Practices* (Infinite Scroll UX Done Right)

### Show more detail without leaving the page

<a id="more-detail-in-place"></a>

| Option | Pick it when |
|---|---|
| [Disclosure](#disclosure) | The detail is text that belongs in the flow of the page |
| [Popover](#popover) | The detail is small and belongs to one control or word |
| [Side sheet](#side-sheet) | The detail is a whole item, viewed while its list stays visible |
| [Modal dialog](#modal-dialog) | The detail needs a decision or a short form before anything else can happen |

Sources: Jakob Nielsen 2006, *Progressive Disclosure* (Progressive Disclosure); Therese Fessenden 2017, *Modal & Nonmodal Dialogs: When (& When Not) to Use Them* (Modal & Nonmodal Dialogs: When (& When Not) to Use Them); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Overlays)

### Open an item from a list

<a id="open-an-item"></a>

| Option | Pick it when |
|---|---|
| [List and detail](#list-detail) | People go through many items in a row on a wide screen |
| [Side sheet](#side-sheet) | People glance at or tweak an item and return to the list |
| [Single-column page](#single-column) | The item needs full width or its own URL: open it as a page |

Sources: Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Two-Panel Selector or Split View); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (One-Window Drilldown); Microsoft, *Windows app design guidance* (List/details)

### Edit a value in place or on a separate screen

<a id="edit-a-value"></a>

| Option | Pick it when |
|---|---|
| [Inline edit](#inline-edit) | One short value is changed at a time and can be validated alone |
| [Modal dialog](#modal-dialog) | A few related fields change together and the page behind gives context |
| [Side sheet](#side-sheet) | The form is longer and the list should stay visible |
| [Single-column page](#single-column) | The edit is long, risky or needs its own URL: use a separate page |

Sources: Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (In-Page Editing); Therese Fessenden 2017, *Modal & Nonmodal Dialogs: When (& When Not) to Use Them* (Modal & Nonmodal Dialogs: When (& When Not) to Use Them); Atlassian, *Atlassian Design System* (Inline edit)

### Structure a multi-step process

<a id="multi-step-process"></a>

| Option | Pick it when |
|---|---|
| [Wizard](#wizard) | Steps come in a fixed order, or later steps depend on earlier answers |
| [Task list](#task-list) | Parts are independent, take more than one sitting or are done by different people |
| [Long page with section navigation](#section-nav-page) | Experts fill it in often and want everything on one page |

Sources: Raluca Budiu 2017, *Wizards: Definition and Design Recommendations* (Wizards: Definition and Design Recommendations); Government Digital Service, *GOV.UK Design System* (Complete multiple tasks); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Wizard)

### Show that something is loading

<a id="show-loading"></a>

| Option | Pick it when |
|---|---|
| [Skeleton screen](#skeleton) | A page or panel of known layout loads within a few seconds |
| [Spinner](#spinner) | A small area or a button waits between about 1 and 10 seconds |
| [Progress bar](#progress-bar) | The work takes longer than about 10 seconds and can be measured |
| [Optimistic update](#optimistic-update) | The action almost always succeeds and its result can be shown at once |

Sources: Katie Sherwin 2014, *Progress Indicators Make a Slow System Less Insufferable* (Progress Indicators Make a Slow System Less Insufferable); Samhita Tankala 2023, *Skeleton Screens 101* (Skeleton Screens 101); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits)

### Handle a list with nothing to show

<a id="nothing-to-show"></a>

| Option | Pick it when |
|---|---|
| [Empty state](#empty-state) | Loading finished and there are no items: explain why and offer the next step |
| [Skeleton screen](#skeleton) | The items are still loading |
| [Banner](#banner) | Loading failed: say so and offer a retry |

Sources: Kate Kaplan 2021, *Designing Empty States in Complex Applications: 3 Guidelines* (Designing Empty States in Complex Applications: 3 Guidelines); IBM, *Carbon Design System* (Empty states); Samhita Tankala 2023, *Skeleton Screens 101* (Skeleton Screens 101)

### Present plans and prices

<a id="compare-plans"></a>

| Option | Pick it when |
|---|---|
| [Pricing table](#pricing-table) | There are two to four plans chosen mainly by price and a few headline features |
| [Comparison table](#comparison-table) | Plans differ in many details that buyers check row by row |

Sources: Kate Moran 2024, *Comparison Tables for Products, Services, and Features* (Comparison Tables for Products, Services, and Features); Vitaly Friedman 2017, *Designing The Perfect Feature Comparison Table* (Designing The Perfect Feature Comparison Table)

### Filter a list

<a id="filter-a-list"></a>

| Option | Pick it when |
|---|---|
| [Search field](#search-field) | People know words that identify the item |
| [Tag](#tag) | A few common filters can be offered as chips above the list and shown when active |
| [Checkbox group](#checkbox-group) | There are several attributes with several values each: show them as facets beside the list |
| [Side sheet](#side-sheet) | There are many filters and the screen is small: open them in a panel with an Apply button |

Sources: Kate Moran 2018, *Helpful Filter Categories and Values for Better UX* (Helpful Filter Categories and Values for Better UX); Kathryn Reeves 2020, *Filtering UX: Display “Applied Filters” in an Overview* (Filtering UX: Display "Applied Filters" in an Overview); IBM, *Carbon Design System* (Filtering)

### Fit more actions than there is room for

<a id="too-many-actions"></a>

| Option | Pick it when |
|---|---|
| [Button group](#button-group) | There are up to about three actions and all are used often |
| [Overflow menu](#overflow-menu) | One or two actions are common and the rest are rare |
| [Split button](#split-button) | One action dominates and the others are variants of it |

Sources: Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Button Groups); Anna Kaley 2019, *Contextual Menus: Delivering Relevant Tools for Tasks* (Contextual Menus: Delivering Relevant Tools for Tasks); Page Laubheimer 2019, *Split Buttons: Definition* (Split Buttons: Definition)

### Offer actions on rows of a list

<a id="row-actions"></a>

| Option | Pick it when |
|---|---|
| [Overflow menu](#overflow-menu) | Each row has several actions and the product is used on touch screens too |
| [Row actions on hover](#hover-row-actions) | Frequent mouse users need one or two quick actions per row |
| [Bulk action bar](#bulk-action-bar) | The same action is often applied to many rows |

Sources: Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Contextual Tools); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Hover or Pop-Up Tools); IBM, *Carbon Design System* (Data table)

### Choose between a link and a button

<a id="link-or-button"></a>

| Option | Pick it when |
|---|---|
| [Text link](#text-link) | Activating it goes somewhere: another page, section or file |
| [Button hierarchy](#button) | Activating it does something: saves, sends, opens a dialog, changes state |

Sources: Jakob Nielsen 2007, *Command Links* (Command Links); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Button pattern); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Link pattern)

### Place the main action of a phone screen

<a id="main-action-on-phone"></a>

| Option | Pick it when |
|---|---|
| [Bottom action bar](#bottom-action-bar) | The action completes the screen's task, such as Continue or Add to cart |
| [Floating action button](#floating-action-button) | The action starts something new from a scrolling list, such as Compose |
| [Button hierarchy](#button) | The screen is short and the action follows the content in the flow |

Sources: Luke Wroblewski 2011, *Mobile First* (Actions); Google, *Material Design 3* (Floating action buttons); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Fitts's Law)

### Tell the user something they did not ask about

<a id="system-message"></a>

| Option | Pick it when |
|---|---|
| [Banner](#banner) | It concerns the whole page or account and should stay until resolved |
| [Badge counter](#badge-counter) | New items are waiting in another section |
| [Toast](#toast) | It is a brief, low-stakes update that can be missed |
| [Modal dialog](#modal-dialog) | Nothing can continue until the user decides; use rarely |

Sources: Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications); Therese Fessenden 2017, *Modal & Nonmodal Dialogs: When (& When Not) to Use Them* (Modal & Nonmodal Dialogs: When (& When Not) to Use Them); IBM, *Carbon Design System* (Notification)

### Switch between views of the same thing

<a id="switch-views"></a>

| Option | Pick it when |
|---|---|
| [View switcher](#view-switcher) | The same items are shown in another arrangement: list, grid, board, calendar |
| [Navigation tabs](#nav-tabs) | Each view is a sub-page of one object with its own URL |
| [Tabbed sections](#tabbed-sections) | Each view is a panel of related content inside one page |

Sources: Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Alternative Views); Evan Sunwall 2024, *Tabs, Used Right* (Tabs, Used Right)

### Open a secondary surface on a phone

<a id="phone-secondary-surface"></a>

| Option | Pick it when |
|---|---|
| [Bottom sheet](#bottom-sheet) | A few options or a short form relate to what is on screen |
| [Full-screen takeover](#full-screen-takeover) | The task has many fields or steps and needs the whole screen |
| [Dropdown menu](#dropdown-menu) | There are a handful of commands attached to one button |

Sources: Page Laubheimer 2023, *Bottom Sheets: Definition and UX Guidelines* (Bottom Sheets: Definition and UX Guidelines); Google, *Material Design 3* (Dialogs); Apple, *Human Interface Guidelines* (Sheets)

### Help new users get started

<a id="onboard-new-users"></a>

| Option | Pick it when |
|---|---|
| [Empty state](#empty-state) | The first screen is empty: explain it and offer the first action there |
| [Task list](#task-list) | Setup has several steps that can be done over time: show a checklist |
| [Coach mark](#coach-mark) | One feature is easy to miss: point to it once, in context |

Sources: Page Laubheimer 2023, *Onboarding Tutorials vs. Contextual Help* (Onboarding Tutorials vs. Contextual Help); Kate Kaplan 2021, *Designing Empty States in Complex Applications: 3 Guidelines* (Designing Empty States in Complex Applications: 3 Guidelines); Apple, *Human Interface Guidelines* (Onboarding)

### Choose the page width

<a id="page-width"></a>

| Option | Pick it when |
|---|---|
| [Contained width](#contained-width) | The page is text, forms or marketing content |
| [Full-bleed width](#full-bleed) | The page is a workspace such as a table, board, map or dashboard |

Sources: Adam Wathan 2018, *Refactoring UI* (Layout and Spacing); Ethan Marcotte 2014, *Responsive Web Design* (The Flexible Grid)

### Answer a press on a button

<a id="press-feedback"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | The control is pressed many times in a row, or its color already changes on press |
| [Press feedback](#press-scale) | The press has no visible answer and the control is a button, card or tile |
| [Hold to confirm](#hold-to-confirm) | The action cannot be undone and a slip would be costly |

Sources: Emil Kowalski, *7 Practical Animation Tips* (Scale your buttons); Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback)

### Answer the pointer on a card

<a id="card-pointer-feedback"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | Dense lists and tables that the pointer crosses all the time |
| [Hover lift](#hover-lift) | A grid of clickable cards that people browse |

Sources: Emil Kowalski, *7 Practical Animation Tips* (Keep your animations fast); Josh W. Comeau 2021, *An Interactive Guide to CSS Transitions* (Action-driven motion)

### Show on the control itself that a small action worked

<a id="acknowledge-small-action"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | The result shows elsewhere at once, such as a row that appears |
| [Icon swap](#icon-swap) | The action finishes at once: copy, like, save |
| [Button status](#status-swap) | The action takes a second or more and the button is where people look |
| [Inline confirmation](#inline-confirmation) | The result needs a word next to the control and should stay for a while |

Sources: Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback); Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications)

### Move the highlight when another tab or segment is chosen

<a id="move-selection"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | Selection is changed from the keyboard all day, or the items wrap onto several lines |
| [Sliding indicator](#sliding-indicator) | The items sit in one row or column and share one highlight |
| [Crossfade](#crossfade) | The items differ much in size or position and a jump is too hard |

Sources: Page Laubheimer 2020, *The Role of Animation and Motion in UX* (The Role of Animation and Motion in UX); Emil Kowalski, *You Don't Need Animations* (Frequency of use)

### Open a section in place

<a id="open-in-place"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | The content is tall, or sections are opened one after another from the keyboard |
| [Expand in place](#expand-height) | What is below would jump and people would lose their place |
| [Fade in](#fade-in) | The height cannot be animated cheaply; the content fades in after the jump |

Sources: Bramus 2024, *Animate to height: auto; (and other intrinsic sizing keywords) in CSS* (Animate to height: auto); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics)

### Bring a menu, popover or panel onto the screen

<a id="overlay-entrance"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | It opens on a keyboard shortcut, or many times a minute |
| [Fade in](#fade-in) | A small hint near the pointer, such as a tooltip |
| [Grow from the trigger](#origin-scale) | It opens from a control: a menu, a popover, a select |
| [Slide in from the edge](#slide-in-panel) | It belongs to an edge of the window: a drawer, a sheet, a toast |

Sources: Emil Kowalski, *7 Practical Animation Tips* (Make your animations origin-aware); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); IBM, *Carbon Design System* (Motion)

### Bring content onto a page as it loads or is added

<a id="content-entrance"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | Product screens that are opened many times a day |
| [Rise in](#rise-in) | A single new item: a toast, a message, a row |
| [Staggered entrance](#stagger-in) | A group of like items on a page seen now and then |
| [Reveal on scroll](#scroll-reveal) | A long story page read once, from top to bottom |

Sources: Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension); Emil Kowalski, *Great Animations* (Great animations have a purpose); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.3.3 Animation from Interactions)

### Change from one page to the next

<a id="page-change"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | An app whose navigation is constant, or pages that load slowly |
| [Page crossfade](#page-crossfade) | A site of separate pages with the same header on each |
| [Shared element](#shared-element-morph) | A list that opens into a detail page showing the same picture or card |

Sources: Chrome for Developers, *Cross-document view transitions for multi-page applications* (Cross-document view transitions for multi-page applications); Google, *Material Design 3* (Motion: transitions)

### Decide whether the top of a landing page moves by itself

<a id="hero-ambient-motion"></a>

| Option | Pick it when |
|---|---|
| [Instant change](#instant-change) | The headline must be understood at a glance, which is most pages |
| [Rotating words](#rotating-words) | One sentence has to name several audiences or uses |
| [Marquee](#marquee) | There are more logos or quotes than fit in a row, and none is more important than the others |

Sources: W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.2.2 Pause, Stop, Hide); Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension)

### Point out something new

<a id="mark-something-new"></a>

| Option | Pick it when |
|---|---|
| [Status badge](#status-badge) | It is enough that people find it when they look |
| [Badge counter](#badge-counter) | The number of new things matters |
| [Attention pulse](#attention-pulse) | It must be noticed once, and nothing else on the screen moves |
| [Coach mark](#coach-mark) | It needs a sentence of explanation |

Sources: Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension); Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications)

## Layouts

<a id="layout"></a>

### Single-column page

<a id="single-column"></a>

`single-column` · also called center stage, centered stage, vertical stack, one-column layout

One column of content, centered on wide screens, that the reader moves through from top to bottom.

**Use when**

- The page has one main task or one piece of content: an article, a form, a question, a checkout step
- The page must work on phones without a separate design
- Reading order matters more than seeing several things at once

**Avoid when**

- People need to compare or switch between many items on the same screen (use list-detail or sidebar-content)
- The page is a dense tool where wide screens should show more, not just more margin

**Rules**

- Limit the text column to about 60–75 characters per line; center it and let the margins grow on wide screens.
- Stack every block in source order with one consistent vertical gap; do not float side blocks next to body text.
- Put the page title first and the primary action at the end of the column, aligned with the left edge of the content.
- Put forms in one column too: one field per row, except short related fields such as city and postcode.
- At 320 CSS px width the page must not scroll sideways.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/styles/layout/): Layout guidance: a two-thirds-width column so lines stay under about 75 characters
- [GOV.UK](https://www.gov.uk/check-uk-visa/y): Question page: heading, one field and one button in a single column
- [Wikipedia (mobile site)](https://en.m.wikipedia.org/wiki/Typography): Article on a phone: header, title and body stacked in one column
- [Every Layout](https://every-layout.dev/layouts/stack/): The Stack: elements in one column separated by a single spacing rule

**Alternatives:** [Sidebar and content](#sidebar-content), [Split screen](#split-screen), [List and detail](#list-detail)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Center Stage); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Vertical Stack); Luke Wroblewski 2011, *Mobile First* (Layout)

### Sidebar and content

<a id="sidebar-content"></a>

`sidebar-content` · also called two-column layout, side navigation layout, app shell with sidebar

A narrow column of navigation or tools beside a wide column that holds the page content.

**Use when**

- The product has many sections or documents and people move between them often
- The side column holds navigation, filters or a table of contents that should stay visible while the content scrolls
- Most use is on screens wide enough for two columns

**Avoid when**

- There are only a few destinations (a top navigation bar is enough)
- The side column would hold content that competes with the main column for attention

**Rules**

- Give the sidebar a fixed width of about 240–320 px and let the content column take the rest.
- Make the sidebar scroll independently and keep it in view while the content scrolls.
- Mark the current item in the sidebar with more than color, and expose it with aria-current="page".
- Below the width where the content column gets too narrow, collapse the sidebar into a drawer or move it above the content.
- Keep the content column readable: cap text width even when the window is very wide.
- Wrap the sidebar in a nav element with a label and add a skip link to the main content.

**Seen in**

- [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/hello-world): Documentation pages: collapsible section tree on the left, article on the right
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): Reference pages: element list on the left, article in the middle, page outline on the right
- [Apple macOS](https://support.apple.com/guide/mac-help/change-system-settings-mh15217/mac): System Settings: categories in a sidebar, the chosen settings on the right
- [GitHub Primer](https://primer.style/product/components/split-page-layout/): SplitPageLayout: a side pane next to a content region

**Alternatives:** [Single-column page](#single-column), [List and detail](#list-detail), [Tabbed sections](#tabbed-sections)

**Sources:** Page Laubheimer 2021, *Left-Side Vertical Navigation on Desktop: Scalable, Responsive, and Easy to Scan* (Left-Side Vertical Navigation on Desktop); Heydon Pickering 2019, *Every Layout* (The Sidebar); Apple, *Human Interface Guidelines* (Sidebars)

### Split screen

<a id="split-screen"></a>

`split-screen` · also called two halves, 50/50 layout

A page divided into two halves of similar weight, usually a task on one side and supporting material on the other.

**Use when**

- A short task such as sign-in or checkout sits next to a summary, an illustration or a reason to continue
- Two things must stay visible together: a form and its live preview, a map and its result list

**Avoid when**

- One half would be decoration that pushes the task below the fold on small screens
- Both halves contain long scrolling content that fights for attention

**Rules**

- Give the task half the stronger contrast and the only primary button.
- Stack the halves below about 768 px, with the task first.
- Scroll the halves independently only when both hold long content; otherwise pin the shorter one.
- Keep the reading order in the markup the same as the visual order so keyboard focus does not jump between halves.

**Seen in**

- [Salesforce](https://login.salesforce.com/): Sign-in page: login form on the left half, promotional panel on the right half
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/split-views): Split views: two or three panes shown side by side
- Stripe Checkout: Hosted payment page: order summary on one half, payment form on the other (not re-checked)

**Alternatives:** [Single-column page](#single-column), [Sidebar and content](#sidebar-content)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Two-Panel Selector or Split View); Apple, *Human Interface Guidelines* (Split views)

### Card grid

<a id="card-grid"></a>

`card-grid` · also called grid of equals, tile grid, gallery

Items of the same kind shown as equal-sized cards in rows and columns.

**Use when**

- The items are peers and none should stand out by default
- Each item is recognized by an image or a few short facts
- People browse rather than look for one known item

**Avoid when**

- People need to compare many attributes across items (use a data table)
- Items are mostly text and are scanned by title (use list rows)
- One item is clearly more important (use featured-grid)

**Rules**

- Give every card the same width and the same internal structure; let rows share the height of their tallest card.
- Let the column count follow the available width, for example grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)).
- Keep the gap between cards smaller than the page margin and larger than the padding inside a card.
- Keep the markup order equal to the visual order and mark the set up as a list so screen readers announce the count.
- Clamp titles to two or three lines so one long title does not stretch a row.

**Seen in**

- [Dribbble](https://dribbble.com/shots/popular): Popular shots: three equal columns of image cards with author and counts beneath
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/collections): Collections: ordered sets of items in a grid
- [Material Design 3](https://m3.material.io/components/cards/guidelines): Cards arranged in grids and lists
- [U.S. Web Design System](https://designsystem.digital.gov/components/card/): Card groups laid out in a responsive grid

**Alternatives:** [Featured item with grid](#featured-grid), [Bento grid](#bento-grid), [Masonry grid](#masonry-grid), [List row](#list-row), [Data table](#data-table)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Grid of Equals); Page Laubheimer 2016, *Cards: UI-Component Definition* (Cards: UI-Component Definition); Adam Wathan 2018, *Refactoring UI* (Layout and Spacing)

### Featured item with grid

<a id="featured-grid"></a>

`featured-grid` · also called lead story layout, magazine layout, hero card plus grid

One item shown large, followed by the remaining items in a smaller grid or list.

**Use when**

- One item is newer or more important than the rest and the page owner decides which
- The page is an editorial front page, a blog index or a catalog with a current highlight

**Avoid when**

- All items are equal (use card-grid)
- The featured slot would be filled automatically with whatever comes first

**Rules**

- Make the featured item at least twice the area of a regular item and place it first in the source order.
- Use the same card parts (image, title, summary) for the featured item, only larger, so it reads as the same kind of thing.
- On narrow screens show the featured item full width, then the rest in one column.
- Feature one item, or at most one per section; several featured items cancel each other out.

**Seen in**

- [The Guardian](https://www.theguardian.com/international): Front page: lead story with a large image above rows of smaller stories
- [Apple](https://www.apple.com/): Home page: one full-width promotion on top, further products in sections below
- [GOV.UK](https://www.gov.uk/): Home page: a short "Popular" block and a "Featured" column beside the full list of topics

**Alternatives:** [Card grid](#card-grid), [Bento grid](#bento-grid), [Feed](#feed)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Feature, Search, and Browse); Adam Wathan 2018, *Refactoring UI* (Hierarchy is Everything); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Von Restorff Effect)

### Bento grid

<a id="bento-grid"></a>

`bento-grid` · also called bento box layout, mixed-size tile grid, asymmetric grid

A grid of tiles in a few different sizes that fit together into one rectangle, each tile showing one feature or fact.

**Use when**

- A landing page has four to nine features of unequal importance to show in one view
- Each feature can be said in a short title, one line of text and a small visual

**Avoid when**

- The items are records of the same kind that people scan or compare (use card-grid or a table)
- Tiles would need long text; uneven tile sizes make uneven text lengths hard to read

**Rules**

- Build on one column grid (for example 6 or 12 columns) and let tiles span whole columns and rows; keep one gap size.
- Give the largest tile to the most important feature and place it first in the markup.
- Keep one corner radius, one padding and one title style across all tiles.
- Collapse to a single column on phones in order of importance, not in visual reading order of the desktop grid.
- Make a tile a link only if the whole tile goes to one place; otherwise put a visible link inside it.

**Seen in**

- [Supabase](https://supabase.com/): Home page: one wide database tile beside smaller tiles for authentication, storage, realtime and other products
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/widgets): Widgets: small, medium and large tiles that share one Home Screen grid

**Alternatives:** [Card grid](#card-grid), [Featured item with grid](#featured-grid), [Alternating feature rows](#zigzag-rows)

**Sources:** Apple, *Human Interface Guidelines* (Widgets); Adam Wathan 2018, *Refactoring UI* (Layout and Spacing); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Grid of Equals)

### Masonry grid

<a id="masonry-grid"></a>

`masonry-grid` · also called waterfall layout, staggered grid

Columns of equal width in which items keep their own height, so rows do not line up.

**Use when**

- Items are images or cards with very different aspect ratios and cropping them would lose content
- People browse for inspiration and order matters little

**Avoid when**

- Reading order matters or people scan for one item: with ragged rows there is no clear order
- Items carry text that must be compared across a row

**Rules**

- Keep column width equal and the gap constant; only height varies.
- Reserve each image's space with width and height attributes or aspect-ratio so the layout does not jump while loading.
- Keep keyboard and screen-reader order equal to the order items are placed in; do not use CSS columns if that sends focus down one column and back to the top of the next.
- Reduce the column count with the width; use one or two columns on phones.

**Seen in**

- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_lanes): Documentation of masonry layout in CSS grid, with examples
- Pinterest: Home feed: pins of varying height packed into equal-width columns (not re-checked)
- Unsplash: Photo listing: photographs of different proportions in three columns (not re-checked)

**Alternatives:** [Card grid](#card-grid), [Thumbnail grid](#thumbnail-grid)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Thumbnail Grid); Heydon Pickering 2019, *Every Layout* (The Grid)

### Dashboard

<a id="dashboard-grid"></a>

`dashboard-grid` · also called overview page, widget grid

A single screen of summary numbers, charts and short lists that answers "how are things right now?" at a glance.

**Use when**

- People return often to check status and decide whether to act
- The same handful of measures matters on every visit
- Each panel can link to a detailed view

**Avoid when**

- The page is the place where work is done (show the work list instead)
- Nobody has decided which few measures matter; a wall of charts is not a dashboard

**Rules**

- Put the few most important numbers in the top row as stat tiles; charts below, detail tables last.
- Give every panel a title that says what is measured and for which period.
- Show the comparison that gives a number meaning: previous period, target or threshold.
- Align panels to a shared column grid; on phones stack them in order of importance.
- Let each panel load, fail and be empty on its own; one failed panel must not blank the page.
- Do not rely on color alone for good and bad; add an icon, sign or word.

**Seen in**

- [Grafana](https://play.grafana.org/): Grafana Play: panels of different kinds arranged on a grid beside a navigation sidebar
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/templates/homepage): App home page template: metrics and next steps
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/data-visualization/dashboards): Dashboard guidance for arranging data visualizations

**Alternatives:** [Card grid](#card-grid), [Data table](#data-table), [Feed](#feed)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Dashboard); Page Laubheimer 2017, *Dashboards: Making Charts and Graphs Easier to Understand* (Dashboards: Making Charts and Graphs Easier to Understand)

### List and detail

<a id="list-detail"></a>

`list-detail` · also called master–detail, two-panel selector, split view, list/details

A list of items on one side and the full content of the selected item on the other.

**Use when**

- People go through many items one after another: messages, tickets, files, settings groups
- Seeing the list while reading an item helps people keep their place

**Avoid when**

- Items need the full width to be read or edited
- People rarely look at more than one item per visit (link to a separate page)

**Rules**

- Show the list in a column of about 280–400 px and the detail in the rest; highlight the selected row.
- Selecting a row replaces the detail without a page reload, but updates the URL so the item can be linked and the Back button works.
- On narrow screens show one pane at a time: the list first, then the detail with a Back control (Microsoft recommends stacking below about 640 px).
- When nothing is selected, show an empty state in the detail pane or select the first item.
- Up and Down arrows move through the list; focus moves to the detail only when the user asks for it.

**Seen in**

- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/list-details): List/details pattern: side-by-side on wide windows, stacked on narrow ones
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/split-views): Split views: Mail shows a message list and the selected message
- [Android](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts?auto_signin=false): Canonical layouts: list-detail
- [Apple macOS](https://support.apple.com/guide/mac-help/change-system-settings-mh15217/mac): System Settings: choose a category in the list, edit it on the right

**Alternatives:** [Sidebar and content](#sidebar-content), [Data table](#data-table), [Side sheet](#side-sheet), [Accordion sections](#accordion-sections)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Two-Panel Selector or Split View); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (One-Window Drilldown); Microsoft, *Windows app design guidance* (List/details)

### Hero and stacked sections

<a id="landing-sections"></a>

`landing-sections` · also called landing page, long-scroll marketing page

A page that opens with one large statement and call to action, followed by full-width sections that each make one point.

**Use when**

- The page introduces one product, service or offer to people who do not know it yet
- There is one main action: sign up, buy, download, contact

**Avoid when**

- Visitors arrive to do a known task (put the task first, not the pitch)
- The page is a home page for many unrelated audiences (use a menu of entry points)

**Rules**

- State what the product is and who it is for in the first screen, with one primary button.
- Give each section one heading, one idea and at most one action; repeat the primary action after every few sections and at the end.
- Order sections by the questions a visitor asks: what is it, how does it work, who uses it, what does it cost.
- Vary section layout, but keep one content width and one spacing scale down the page.
- Use real headings (one h1, then h2 per section) so the page can be navigated by heading.

**Seen in**

- [Stripe](https://stripe.com/): Home page: headline with two buttons, customer logos, then product sections
- [Linear](https://linear.app/): Home page: headline over a product screenshot, then feature sections
- [Supabase](https://supabase.com/): Home page: headline and buttons, product tiles, customer logos, feature sections
- [U.S. Web Design System](https://designsystem.digital.gov/templates/landing-page/): Landing page template: hero, tagline, graphic list, call to action

**Alternatives:** [Long page with section navigation](#section-nav-page), [Featured item with grid](#featured-grid)

**Sources:** Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (The Big Bang Theory of Web Design); Huei-Hsin Wang 2024, *Homepage Design: 5 Fundamental Principles* (Homepage Design: 5 Fundamental Principles); Therese Fessenden 2018, *Scrolling and Attention* (Scrolling and Attention)

### Centered hero

<a id="hero-centered"></a>

`hero-centered` · also called centered headline hero

A page opening with headline, one or two lines of text and buttons centered in the column, with any image or product shot below.

**Use when**

- The message is short and the headline can carry the page
- The product visual is wide (a screenshot) and reads best under the text

**Avoid when**

- The headline is long or needs a paragraph of explanation; centered multi-line text is harder to read
- A form must be filled in the hero (use hero-split)

**Rules**

- Keep the headline to about two lines and the supporting text under about 65 characters per line.
- Show one primary button and at most one secondary button, side by side, stacked on phones.
- Keep the primary button visible without scrolling at 1280×720 and at 390×844.
- If a product image follows, let it start within the first screen so people see there is more below.

**Seen in**

- [Raycast](https://www.raycast.com/): Home page: centered headline, one line of text and one download button
- [GitHub](https://github.com/pricing): Pricing page: centered heading, short paragraph and two buttons above the plans
- [Apple](https://www.apple.com/): Product sections: centered product name, tagline and "Learn more" / "Buy" buttons above the image

**Alternatives:** [Split hero](#hero-split)

**Sources:** Adam Wathan 2018, *Refactoring UI* (Designing Text); Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (Billboard Design 101); Huei-Hsin Wang 2024, *Homepage Design: 5 Fundamental Principles* (Homepage Design: 5 Fundamental Principles)

### Split hero

<a id="hero-split"></a>

`hero-split` · also called text-and-media hero, two-column hero

A page opening with headline, text and buttons on one side and an image, product shot or form on the other.

**Use when**

- The visual explains the product as much as the words do
- The hero contains a sign-up form or search that deserves its own side
- The headline is long and reads better left-aligned

**Avoid when**

- The image is decorative and would push the text column too narrow
- The product shot needs the full width to be legible (use hero-centered with the shot below)

**Rules**

- Put the text first in the source order and, in left-to-right languages, on the left; people look at the left half of the page first.
- Left-align the text block and align it vertically with the middle of the media.
- Stack below about 768 px: text and buttons first, media after.
- Give the media a fixed aspect ratio so the text does not move while it loads.

**Seen in**

- [Stripe](https://stripe.com/): Home page: headline and two buttons on the left, artwork filling the right
- [Supabase](https://supabase.com/): Home page: headline and buttons on the left, description on the right
- [Linear](https://linear.app/): Home page: left-aligned headline and description above a product screenshot

**Alternatives:** [Centered hero](#hero-centered)

**Sources:** Adam Wathan 2018, *Refactoring UI* (Designing Text); Kara Pernice 2017, *F-Shaped Pattern of Reading: Misunderstood, But Still Relevant* (F-Shaped Pattern of Reading); Huei-Hsin Wang 2024, *Homepage Design: 5 Fundamental Principles* (Homepage Design: 5 Fundamental Principles)

### Alternating feature rows

<a id="zigzag-rows"></a>

`zigzag-rows` · also called zigzag layout, alternating image and text

A stack of rows, each with text on one side and an image on the other, with the sides swapping from row to row.

**Use when**

- Each feature needs an image that carries information, such as a screenshot of that feature
- There are three to five features, each worth a short paragraph

**Avoid when**

- The images are decorative; NN/g found that alternating decorative images make scanning less efficient
- There are many short features (use a card grid or a list)

**Rules**

- Keep headings on a predictable line: if scanning matters more than rhythm, keep all text on the same side.
- Give every row the same structure: heading, two or three lines, optional link.
- On phones stack every row the same way (heading, text, image) regardless of desktop side.
- Keep text first in the source order in every row; swap sides with CSS only.

**Seen in**

- [Vercel](https://vercel.com/): Home page: feature rows in which the screenshot and the text swap sides from one row to the next
- Apple: Product pages that alternate image-left and image-right feature rows (not re-checked)

**Alternatives:** [Card grid](#card-grid), [Bento grid](#bento-grid)

**Sources:** Kim Flaherty 2017, *Zigzag Image–Text Layouts Make Scanning Less Efficient* (Zigzag Image–Text Layouts Make Scanning Less Efficient); Kara Pernice 2019, *The Layer-Cake Pattern of Scanning Content on the Web* (The Layer-Cake Pattern of Scanning Content on the Web)

### Long page with section navigation

<a id="section-nav-page"></a>

`section-nav-page` · also called sticky table of contents, scrollspy page, anchor navigation, in-page navigation

One long page whose section headings are listed in a menu that stays in view and jumps to each section.

**Use when**

- The content is one document that people read in parts or search with the browser
- People need to see everything on one page or print it
- Sections are long enough that scrolling between them takes effort

**Avoid when**

- Sections are unrelated tasks that should not load together (use separate pages)
- The page is short: fewer than about four sections

**Rules**

- List the section headings as links to anchors; clicking scrolls to the section and updates the URL fragment.
- Keep the list in view: in a side column on wide screens, as a collapsed "On this page" control above the content on narrow ones.
- Highlight the section currently in view, and mark that link with aria-current.
- Offset the scroll target (scroll-margin-top) so a sticky header does not cover the heading.
- Use the same words in the link and in the heading it points to.
- Wrap the list in a nav element labelled "On this page" or similar.

**Seen in**

- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Articles: a "Contents" list of the sections in the left column beside the text
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): Reference pages: "In this article" outline on the right
- [U.S. Web Design System](https://designsystem.digital.gov/components/in-page-navigation/): In-page navigation: a sticky list of the headings on the page
- [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/hello-world): Articles: an "In this article" control above the content

**Alternatives:** [Tabbed sections](#tabbed-sections), [Accordion sections](#accordion-sections), [Wizard](#wizard)

**Sources:** Huei-Hsin Wang 2023, *Table of Contents: The Ultimate Design Guide* (Table of Contents: The Ultimate Design Guide); Huei-Hsin Wang 2023, *In-Page Links for Content Navigation* (In-Page Links for Content Navigation); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Titled Sections)

### Tabbed sections

<a id="tabbed-sections"></a>

`tabbed-sections` · also called module tabs, in-page tabs, tab panel layout

Related content split into panels, with a row of labels that shows one panel at a time.

**Use when**

- The content falls into two to about seven parallel groups with short names
- People need one group at a time and do not compare across groups
- The groups are views of the same object: overview, activity, settings

**Avoid when**

- People must compare or copy between panels
- The panels are steps in a sequence (use a wizard or step indicator)
- The labels do not fit one row; a second row of tabs breaks the metaphor

**Rules**

- Show the selected tab as joined to its panel and clearly different from the others, not by color alone.
- Keep tab labels to one or two words and keep all tabs in a single row; scroll horizontally on small screens rather than wrap.
- Follow the ARIA tabs pattern: role tablist, tab and tabpanel; Left and Right arrows move between tabs, Tab moves into the panel.
- Do not change the page behind the user: switching tabs must not submit forms or lose input.
- Give each tab a URL (query or fragment) when people will share or return to it.
- Keep panel content in the DOM order under its tab so the page still works when printed or without script.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/tabs/): Tabs for related sections of content on one page
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): Tabs pattern with keyboard behavior
- [Airbnb](https://www.airbnb.com/): Home page: "Popular", "Arts & culture", "Beach" and other tabs above a list of destinations
- [Mastodon](https://mastodon.social/explore): Explore page: "Posts", "Hashtags" and "News" tabs above the feed

**Alternatives:** [Accordion sections](#accordion-sections), [Long page with section navigation](#section-nav-page), [Sidebar and content](#sidebar-content), [View switcher](#view-switcher)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Module Tabs); Evan Sunwall 2024, *Tabs, Used Right* (Tabs, Used Right); Heydon Pickering 2019, *Inclusive Components* (Tabbed Interfaces)

### Accordion sections

<a id="accordion-sections"></a>

`accordion-sections` · also called collapsible sections, expand/collapse panels

A stack of headings that each open and close their own block of content in place.

**Use when**

- People need only a few of many sections and the headings tell them which
- Space is tight, especially on phones
- Seeing all headings at once gives a useful overview

**Avoid when**

- Most people need most of the content: opening every section is more work than scrolling
- People search the page with the browser's find, or print it
- There are only two or three short sections (just show them)

**Rules**

- Make the whole heading row a button with aria-expanded, and put an icon that shows open or closed on it.
- Allow several sections to be open at once; do not close one section when another opens.
- Offer "Show all sections" when there are many sections.
- Keep headings specific enough to choose from without opening.
- Do not nest accordions and do not put an accordion inside a tab panel.
- Keep section state when the user navigates away and back.

**Seen in**

- [GOV.UK](https://www.gov.uk/learn-to-drive-a-car): Step-by-step page: numbered sections that open with "Show", plus "Show all steps"
- [GOV.UK Design System](https://design-system.service.gov.uk/components/accordion/): Accordion with advice to test the content without one first
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/): Accordion pattern with keyboard behavior
- [U.S. Web Design System](https://designsystem.digital.gov/components/accordion/): Accordion: bordered and multiselectable variants

**Alternatives:** [Tabbed sections](#tabbed-sections), [Long page with section navigation](#section-nav-page), [Disclosure](#disclosure)

**Sources:** Huei-Hsin Wang 2023, *Accordions on Desktop: When and How to Use* (Accordions on Desktop: When and How to Use); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Accordion); Heydon Pickering 2019, *Inclusive Components* (Collapsible Sections)

### Wizard

<a id="wizard"></a>

`wizard` · also called one thing per page, multi-step form, stepped flow

A task split into a fixed sequence of screens, each asking for one thing, with Back and Continue.

**Use when**

- The task is long or unfamiliar and done rarely
- Later questions depend on earlier answers
- Each step can be validated and saved on its own

**Avoid when**

- Experts do the task often and want everything on one screen
- Steps are independent and can be done in any order (use a task list)
- People must see earlier answers while filling later steps

**Rules**

- Ask one question or one closely related group per screen, with the question as the page heading.
- Put one primary button, "Continue", after the fields; put "Back" as a link at the top; make the last step's button say what happens ("Submit application").
- Keep answers when people go back and forward, and let the browser Back button work.
- Show a "Check your answers" screen with a Change link per answer before the final submit.
- Show progress only if the number of steps is known and does not change with the answers.
- Validate each step on Continue and keep the user on the step until it passes.

**Seen in**

- [GOV.UK](https://www.gov.uk/check-uk-visa/y): "Check if you need a UK visa": one question per page with a Continue button
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/question-pages/): Question pages pattern: one thing per page
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/check-answers/): Check answers pattern: review screen before submitting
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/win32/uxguide/win-wizards): Windows wizard guidelines

**Alternatives:** [Task list](#task-list), [Long page with section navigation](#section-nav-page), [Accordion sections](#accordion-sections)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Wizard); Raluca Budiu 2017, *Wizards: Definition and Design Recommendations* (Wizards: Definition and Design Recommendations); Adam Silver 2018, *Form Design Patterns* (A Checkout Form)

### Task list

<a id="task-list"></a>

`task-list` · also called hub and spoke, setup checklist

A page listing the parts of a long job, each with its status, that people can complete in any order and over several visits.

**Use when**

- The job has several independent parts that take more than one sitting
- People need to see what is done and what is left
- Different people may complete different parts

**Avoid when**

- The parts must be done in a fixed order with nothing to choose (use a wizard)
- The whole job takes a few minutes

**Rules**

- Show each task as a row with a link and a status such as "Not yet started", "In progress", "Completed".
- Group tasks under short headings when there are more than about six.
- Return the user to the task list after each task, with the status updated.
- Show tasks that cannot be started yet as plain text with "Cannot start yet" and say what unlocks them.
- Enable the final submit only when every required task is complete, and say which tasks are missing if not.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/task-list/): Task list: rows of tasks with a status tag each
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/): Complete multiple tasks pattern
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/setup-guide): Setup guide: a checklist of onboarding steps with completion state

**Alternatives:** [Wizard](#wizard), [Accordion sections](#accordion-sections)

**Sources:** Government Digital Service, *GOV.UK Design System* (Complete multiple tasks); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Zeigarnik Effect); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Goal-Gradient Effect)

### Feed

<a id="feed"></a>

`feed` · also called stream, timeline, activity stream

A single column of items in time order, newest first, that keeps growing.

**Use when**

- Content arrives continuously and recency is the main order
- Items are short and read in passing: posts, updates, events
- People return often to see what is new

**Avoid when**

- People look for one specific item (give them search, filters or a table)
- Items must be compared by attribute
- There is a natural end, such as a result list; use pagination

**Rules**

- Use one column of at most about 600–700 px so items are read top to bottom without horizontal eye movement.
- Give every item the same skeleton: author or source, time, body, actions.
- Show time as relative for recent items ("2h") with the exact time available on hover or focus.
- When new items arrive, announce them with a "Show new items" control rather than moving what the user is reading.
- Keep scroll position when the user opens an item and comes back.
- Mark the list up with role="feed" and each item as an article when it loads more on scroll.

**Seen in**

- [Mastodon](https://mastodon.social/explore): Explore page: a single column of posts with author, time, content and actions
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/feed/): Feed pattern: keyboard and screen-reader behavior for a scrolling list of articles
- [GitHub](https://github.blog/changelog/): Changelog: a dated stream of product updates

**Alternatives:** [Card grid](#card-grid), [Featured item with grid](#featured-grid), [Data table](#data-table), [Timeline](#timeline)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Streams and Feeds); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Feed pattern); Tim Neusesser 2022, *Infinite Scrolling: When to Use It, When to Avoid It* (Infinite Scrolling: When to Use It, When to Avoid It)

### Comparison table

<a id="comparison-table"></a>

`comparison-table` · also called feature matrix, compare view

A table with the things being compared as columns and their attributes as rows, so differences can be read across.

**Use when**

- People choose between a few options that share the same attributes: plans, products, models
- The differences are in the details, not in one headline number

**Avoid when**

- There are more than about five options; NN/g advises narrowing to five or fewer first
- Options do not share attributes, so most cells would be empty

**Rules**

- Put options in columns and attributes in rows; keep the option names visible as sticky column headers while scrolling.
- Group rows under subheadings and use the same unit and wording across a row.
- Use text or a labelled icon in every cell; never leave a cell blank to mean "no".
- Offer "Show only differences" when most rows are identical.
- On phones show two columns at a time with a control to pick which options to compare, or stack one option per card.
- Mark up as a real table with column and row headers.

**Seen in**

- [Apple](https://www.apple.com/iphone/compare/): Compare iPhone models: three columns, each with a model picker, and attribute rows beneath
- [Slack](https://slack.com/pricing): Pricing page: "Compare all features" table under the plan cards
- [GitHub](https://github.com/pricing): Pricing page: plans side by side with a "Compare plans" button

**Alternatives:** [Pricing table](#pricing-table), [Card grid](#card-grid), [Data table](#data-table)

**Sources:** Kate Moran 2024, *Comparison Tables for Products, Services, and Features* (Comparison Tables for Products, Services, and Features); Edward Scott 2022, *4 Ways to Optimize the Comparison Feature for Scanning* (4 Ways to Optimize the Comparison Feature for Scanning); Vitaly Friedman 2017, *Designing The Perfect Feature Comparison Table* (Designing The Perfect Feature Comparison Table)

### Sticky header

<a id="sticky-header"></a>

`sticky-header` · also called fixed header, persistent header

A header that stays at the top of the window while the page scrolls.

**Use when**

- Pages are long and people need navigation, search or a key action at any scroll position
- The header carries context that must stay visible, such as the name of the object being edited

**Avoid when**

- The header is tall; on small screens it takes space from the content
- Pages are short
- The header holds nothing people need mid-page

**Rules**

- Keep it small: a single row, and shrink or drop secondary rows once the user scrolls.
- Separate it from the content with a border, shadow or solid background so content does not show through.
- Never let it cover the focused element or an anchor target: set scroll-padding-top to the header height.
- If it hides on scroll down and returns on scroll up, animate it briefly and never on small scroll jitters.
- Keep it in the normal tab order first on the page, with a skip link to the content.

**Seen in**

- [Material Design 3](https://m3.material.io/components/app-bars/guidelines): Top app bar: stays at the top and changes on scroll
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-header/guidelines): UI shell header: persistent across the product

**Alternatives:** [Back-to-top link](#back-to-top), [Long page with section navigation](#section-nav-page)

**Sources:** Page Laubheimer 2021, *Sticky Headers: 5 Ways to Make Them Better* (Sticky Headers: 5 Ways to Make Them Better); Vitaly Friedman 2023, *Designing Sticky Menus: UX Guidelines* (Designing Sticky Menus: UX Guidelines); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Focus Not Obscured (Minimum))

### Bottom action bar

<a id="bottom-action-bar"></a>

`bottom-action-bar` · also called sticky footer, sticky call to action, docked toolbar

A bar fixed to the bottom of the window that holds the main action for the current screen.

**Use when**

- The main action must be reachable at any scroll position: add to cart, continue, send
- The screen is a phone, where the bottom edge is easiest to reach with a thumb
- A summary such as a total needs to stay next to the action

**Avoid when**

- The page already has a bottom tab bar and the two would stack
- The action only makes sense after reading the page to the end

**Rules**

- Hold one primary action, at most one secondary, and optionally one line of summary.
- Make the bar opaque with a top border or shadow, and add bottom padding to the page equal to the bar height so nothing is hidden behind it.
- Respect the device safe area: pad with env(safe-area-inset-bottom).
- Keep it above the on-screen keyboard only if the action is needed while typing; otherwise let the keyboard cover it.
- Make sure a focused field is never hidden under the bar.

**Seen in**

- [Material Design 3](https://m3.material.io/components/toolbars/guidelines): Toolbars: docked and floating bars of actions at the bottom of the screen
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/toolbars): Toolbars: actions for the current view
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/app-bridge-web-components/save-bar): Contextual save bar: Save and Discard stay in view while a form has changes

**Alternatives:** [Sticky save bar](#sticky-save-bar), [Floating action button](#floating-action-button), [Button hierarchy](#button)

**Sources:** Luke Wroblewski 2011, *Mobile First* (Actions); Google, *Material Design 3* (Toolbars); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Focus Not Obscured (Minimum))

### Contained width

<a id="contained-width"></a>

`contained-width` · also called fixed max width, centered container, boxed layout

Page content held inside a centered column with a maximum width, leaving empty margins on wide screens.

**Use when**

- The page is mostly text or forms, which become hard to read in long lines
- The same layout should look the same on a laptop and a very wide monitor

**Avoid when**

- The content is a table, map, board or canvas that gets better with every extra pixel
- A band of color or an image is meant to reach both edges (use full-bleed for that band)

**Rules**

- Set one max width for the site (commonly 960–1280 px) and center it with auto margins.
- Keep a side padding of at least 16 px so content never touches the window edge.
- Inside the container, still limit running text to about 75 characters per line.
- Use the same container for header, content and footer so their edges line up.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/styles/layout/): Layout guidance: page content in a width container with a two-thirds reading column
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Articles: a limited-width text column, with a "Width" setting to switch to wide
- [U.S. Web Design System](https://designsystem.digital.gov/utilities/layout-grid/): Layout grid: grid-container with a maximum width

**Alternatives:** [Full-bleed width](#full-bleed)

**Sources:** Adam Wathan 2018, *Refactoring UI* (Layout and Spacing); Ethan Marcotte 2014, *Responsive Web Design* (The Flexible Grid); Government Digital Service, *GOV.UK Design System* (Layout)

### Full-bleed width

<a id="full-bleed"></a>

`full-bleed` · also called edge to edge, fluid width, full-width layout

Content or a background band that spans the whole window width.

**Use when**

- The content is a workspace that benefits from width: tables, boards, maps, editors, dashboards
- A section background, image or video should run edge to edge to separate it from its neighbors

**Avoid when**

- The content is running text; lines get too long on wide screens
- Wide screens would only stretch empty space between a few items

**Rules**

- Let the background run edge to edge but keep the text and controls inside the same container width as the rest of the page.
- Give full-width tools a sensible minimum: collapse side panels before the main area gets too narrow.
- Use responsive images (srcset and sizes) so a full-width image is not loaded at a small device's cost.
- Check at 2560 px wide: nothing should stretch to unreadable line lengths or leave controls far from their labels.

**Seen in**

- [Stripe](https://stripe.com/): Home page: artwork runs to the window edge while text stays in a contained column
- [GOV.UK](https://www.gov.uk/): Home page: a blue band across the full width with the heading and search inside the page container
- [Grafana](https://play.grafana.org/): Dashboard: panels use the whole window width beside the sidebar

**Alternatives:** [Contained width](#contained-width)

**Sources:** Ethan Marcotte 2014, *Responsive Web Design* (The Flexible Grid); Adam Wathan 2018, *Refactoring UI* (Layout and Spacing)

## Navigation

<a id="navigation"></a>

### Top navigation bar

<a id="top-nav"></a>

`top-nav` · also called horizontal navigation, navbar, global navigation

A row of links to the main sections of a site, across the top of every page.

**Use when**

- The site has about two to seven top-level sections with short names
- Content needs the full page width
- Visitors are new and should see the sections without opening anything

**Avoid when**

- There are more sections than fit one row at common widths (use a sidebar or a mega menu)
- The product is a tool with deep, frequently switched sections (use a sidebar)

**Rules**

- Show the section links as visible text on screens wide enough; do not hide them behind a menu icon on desktop.
- Order: logo linking home at the start, section links next, search and account at the end.
- Mark the current section with more than color and with aria-current="page".
- Wrap the links in a nav element with a label; put a skip link before it.
- If an item opens a submenu, make it a button with aria-expanded and open it on click; if it also opens on hover, wait about 300–500 ms first.
- Below the width where the links stop fitting, move them into a menu button or a bottom tab bar.

**Seen in**

- [Stripe](https://stripe.com/): Home page: Products, Solutions, Developers, Resources and Pricing across the top, sign-in at the end
- [Slack](https://slack.com/pricing): Site header: five section links, search, sign-in and two buttons
- [U.S. Web Design System](https://designsystem.digital.gov/components/header/): Header: basic and extended variants with primary navigation
- [GOV.UK Design System](https://design-system.service.gov.uk/components/service-navigation/): Service navigation: links to the sections of a service

**Alternatives:** [Sidebar navigation](#sidebar-nav), [Navigation drawer](#nav-drawer), [Mega menu](#mega-menu), [Bottom tab bar](#bottom-tab-bar)

**Sources:** Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (Street signs and Breadcrumbs); Kara Pernice 2016, *Hamburger Menus and Hidden Navigation Hurt UX Metrics* (Hamburger Menus and Hidden Navigation Hurt UX Metrics); Edward Scott 2023, *Provide a Hover Delay of 300–500 MS for Hover-Based Drop-Down Menus (60% Don’t)* (Provide a Hover Delay of 300–500 MS for Hover-Based Drop-Down Menus)

### Sidebar navigation

<a id="sidebar-nav"></a>

`sidebar-nav` · also called side navigation, vertical navigation, left nav, navigation rail

A vertical list of destinations down the side of the page, often with nested groups.

**Use when**

- There are many destinations, or the list will grow
- Destinations form two or more levels
- People switch sections often during work, as in applications and documentation

**Avoid when**

- There are five or fewer destinations and the content needs width (use a top bar)
- The screen is a phone (collapse to a drawer or a bottom tab bar)

**Rules**

- Put it on the leading edge; NN/g notes people look at the left side of the page most.
- Show icon and text label for each item; an icon-only rail needs tooltips and well-known icons.
- Indent nested levels and make a parent either a link or an expander, not both on the same click target.
- Keep the current item highlighted and its parents expanded; expose it with aria-current.
- Let the list scroll on its own when it is taller than the window.
- When collapsible, remember the user's choice between visits.

**Seen in**

- [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/hello-world): Documentation: a tree of sections that expand to show their pages
- [Grafana](https://play.grafana.org/): Application: icon-and-label sections down the left, some with expanders
- [U.S. Web Design System](https://designsystem.digital.gov/components/side-navigation/): Side navigation: hierarchical, vertical navigation with up to three levels
- [Material Design 3](https://m3.material.io/components/navigation-rail/guidelines): Navigation rail: a vertical strip of destinations for wider windows

**Alternatives:** [Top navigation bar](#top-nav), [Navigation drawer](#nav-drawer), [Navigation tabs](#nav-tabs), [Bottom tab bar](#bottom-tab-bar)

**Sources:** Page Laubheimer 2021, *Left-Side Vertical Navigation on Desktop: Scalable, Responsive, and Easy to Scan* (Left-Side Vertical Navigation on Desktop); Apple, *Human Interface Guidelines* (Sidebars); Page Laubheimer 2021, *Local Navigation Is a Valuable Orientation and Wayfinding Aid* (Local Navigation Is a Valuable Orientation and Wayfinding Aid)

### Bottom tab bar

<a id="bottom-tab-bar"></a>

`bottom-tab-bar` · also called bottom navigation, navigation bar, tab bar

A bar fixed to the bottom of a phone screen with three to five top-level destinations, each an icon with a label.

**Use when**

- The product has three to five sections of similar importance
- People switch between sections often
- The screen is a phone or small tablet

**Avoid when**

- There are more than five destinations (put the extra ones behind a "More" item or in a drawer)
- There are only two destinations, or the items are actions rather than places
- The window is wide; use a rail or sidebar there

**Rules**

- Use three to five items, as both Material Design and Apple advise; never scroll the bar.
- Give every item an icon and a short text label; do not rely on icons alone.
- Show the selected item with a filled icon or indicator plus a color change.
- Tapping an item goes to the top level of that section; tapping the selected item again returns to its start or scrolls to the top.
- Keep the bar visible on every top-level screen; hide it only inside full-screen tasks.
- Make each target at least 48×48 CSS px and pad for the device safe area.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/tab-bars): Tab bars: for example the Alarm, Stopwatch and Timer tabs in Clock
- [Material Design 3](https://m3.material.io/components/navigation-bar/guidelines): Navigation bar: three to five destinations at the bottom of the window
- Instagram: Phone app: five destinations in a bar at the bottom (not re-checked)

**Alternatives:** [Navigation drawer](#nav-drawer), [Top navigation bar](#top-nav), [Sidebar navigation](#sidebar-nav)

**Sources:** Apple, *Human Interface Guidelines* (Tab bars); Google, *Material Design 3* (Navigation bar); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Bottom Navigation)

### Navigation drawer

<a id="nav-drawer"></a>

`nav-drawer` · also called hamburger menu, off-canvas menu, menu button

Navigation hidden behind a menu button that opens a panel of links over or beside the page.

**Use when**

- The screen is too narrow to show the navigation
- There are too many destinations for a tab bar
- Navigation is used rarely compared with the content

**Avoid when**

- The screen is wide enough to show the links; NN/g measured lower use of navigation, longer task times and lower discoverability when it was hidden, more so on desktop
- People move between a few sections all the time (use a bottom tab bar)

**Rules**

- Label the button with the word "Menu", with or without the three-line icon.
- Make the button a real button with aria-expanded and aria-controls; move focus into the drawer when it opens.
- When the drawer covers the page, treat it as a modal: trap focus, close on Escape and on a tap outside, return focus to the button.
- Show the current section inside the drawer.
- Keep the most used destinations visible outside the drawer when space allows.

**Seen in**

- [Material Design 3](https://m3.material.io/components/navigation-drawer/guidelines): Navigation drawer: standard and modal variants
- [Wikipedia (mobile site)](https://en.m.wikipedia.org/wiki/Typography): Mobile site: a three-line button opens the main menu
- [GOV.UK](https://www.gov.uk/learn-to-drive-a-car): Site header: a "Menu" button that expands the navigation, with search next to it

**Alternatives:** [Bottom tab bar](#bottom-tab-bar), [Top navigation bar](#top-nav), [Sidebar navigation](#sidebar-nav)

**Sources:** Kara Pernice 2016, *Hamburger Menus and Hidden Navigation Hurt UX Metrics* (Hamburger Menus and Hidden Navigation Hurt UX Metrics); Raluca Budiu 2015, *Basic Patterns for Mobile Navigation* (Basic Patterns for Mobile Navigation); Google, *Material Design 3* (Navigation drawer)

### Mega menu

<a id="mega-menu"></a>

`mega-menu` · also called fat menu, mega dropdown

A large panel that opens from a top navigation item and shows many links at once, arranged in labelled groups.

**Use when**

- The site has many categories on two levels and people benefit from seeing them together
- The options are easier to choose from when grouped and, where useful, illustrated

**Avoid when**

- The section has only a handful of links (use a plain dropdown menu)
- The screen is a phone; a mega menu does not fit and hover does not exist

**Rules**

- Show all options at once in columns under short group headings; do not make the panel scroll.
- Open on click, or on hover only after the pointer rests on the item (NN/g: about 0.5 s; Baymard: 300–500 ms), and keep it open briefly after the pointer leaves.
- Make the trigger a button with aria-expanded; Escape closes the panel and returns focus to the trigger.
- Keep the panel narrower than the window and anchored to the navigation bar.
- On phones replace it with an accordion list inside the navigation drawer.
- Do not use a menu role for site navigation: a list of links in a nav landmark is enough.

**Seen in**

- [U.S. Web Design System](https://designsystem.digital.gov/components/header/): Header: megamenu variant that opens a multi-column panel of links
- [W3C WAI tutorials](https://www.w3.org/WAI/tutorials/menus/flyout/): Fly-out menus tutorial: keyboard and timing behavior
- Amazon: Department menu: categories on the left and their subcategories in columns (not re-checked)

**Alternatives:** [Top navigation bar](#top-nav), [Sidebar navigation](#sidebar-nav), [Dropdown menu](#dropdown-menu)

**Sources:** Angie Li 2017, *Mega Menus Work Well for Site Navigation* (Mega Menus Work Well for Site Navigation); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Fat Menus); Vitaly Friedman 2021, *User-Friendly Mega-Dropdowns: When Hover Menus Fail* (User-Friendly Mega-Dropdowns: When Hover Menus Fail)

### Navigation tabs

<a id="nav-tabs"></a>

`nav-tabs` · also called underline navigation, local navigation tabs, sub-navigation

A row of labels under the page header that switches between the sibling pages of one object or section.

**Use when**

- One object has a few fixed sub-pages: Overview, Activity, Settings
- People move between the sub-pages often and need to see which one they are on

**Avoid when**

- The labels are steps of a process (use a step indicator)
- There are more sub-pages than fit one row (use sidebar navigation)
- Switching only changes content inside the page, not the URL (use tabbed sections)

**Rules**

- Build them as links in a nav element, not as ARIA tabs: each one loads a page and has its own URL.
- Mark the current one with a visible indicator and aria-current="page".
- Keep labels to one or two words and the set to one row; on small screens scroll the row or move overflow into a "More" menu.
- Keep the set and its order identical on every sub-page.

**Seen in**

- [GitHub Primer](https://primer.style/product/components/underline-nav/): UnderlineNav: navigation between the pages of a repository or profile
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Article header: "Article" and "Talk", and "Read", "Edit", "View history"
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/tabs/guidelines): Tabs: line and contained tabs for switching between views

**Alternatives:** [Sidebar navigation](#sidebar-nav), [Tabbed sections](#tabbed-sections), [View switcher](#view-switcher)

**Sources:** Evan Sunwall 2024, *Tabs, Used Right* (Tabs, Used Right); Page Laubheimer 2021, *Local Navigation Is a Valuable Orientation and Wayfinding Aid* (Local Navigation Is a Valuable Orientation and Wayfinding Aid)

### Breadcrumbs

<a id="breadcrumbs"></a>

`breadcrumbs` · also called breadcrumb trail

A row of links showing where the current page sits in the site hierarchy, from the top level down.

**Use when**

- The site has three or more levels and people arrive deep inside it from search or links
- People need to go up one or more levels

**Avoid when**

- The site is flat or has one level
- The page is a step in a linear process (use a Back link)
- They would replace the main navigation instead of supplementing it

**Rules**

- Show the path of the hierarchy, not the pages the user happened to visit.
- Start with the home or top level and end with the parent of the current page, or with the current page as plain text, not a link.
- Place them above the page title, in a small type size, on one line.
- Mark up as an ordered list inside a nav element labelled "Breadcrumb"; mark a current-page item with aria-current="page".
- On small screens show only the parent as a "back to" link, or let the trail scroll; do not wrap onto several lines.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/breadcrumbs/): Breadcrumbs: from the home page to the parent section
- [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/hello-world): Documentation: Home / Get started / Using GitHub / Hello World above the article
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): Reference pages: Web > HTML > Reference > Elements > <dialog>
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): Breadcrumb pattern

**Alternatives:** [Sidebar navigation](#sidebar-nav), [Navigation tabs](#nav-tabs)

**Sources:** Page Laubheimer 2018, *Breadcrumbs: 11 Design Guidelines for Desktop and Mobile* (Breadcrumbs: 11 Design Guidelines for Desktop and Mobile); Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (Street signs and Breadcrumbs); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Breadcrumbs)

### Pagination

<a id="pagination"></a>

`pagination` · also called paging, page numbers

A long list split into numbered pages, with controls to move to the next, previous or a specific page.

**Use when**

- People look for a specific item and need to keep their place, return to it or share it
- The list has a known size and a stable order
- The page has a footer people must be able to reach

**Avoid when**

- The list is short enough to show whole
- Content is a stream that people skim with no goal (infinite scroll or load-more fits better)

**Rules**

- Show "Previous" and "Next" as words, the current page, and enough page numbers to jump; use an ellipsis for gaps.
- Put the page number in the URL so pages can be bookmarked and the Back button restores the position.
- State the range and total: "Showing 21–40 of 312".
- Place the control after the list; repeat it above only for very long pages.
- Mark up as links inside a nav element labelled "Pagination"; mark the current page with aria-current="page".
- On small screens keep Previous, Next and the current page; drop the other numbers.

**Seen in**

- [GOV.UK](https://www.gov.uk/search/all?keywords=passport): Search results: "Next page" with "2 of 634" beneath the list
- [GOV.UK Design System](https://design-system.service.gov.uk/components/pagination/): Pagination: numbered pages and previous/next links
- [U.S. Web Design System](https://designsystem.digital.gov/components/pagination/): Pagination: page numbers with ellipses for skipped ranges
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/pagination/guidelines): Pagination: items per page, item range and page selector

**Alternatives:** [Infinite scroll](#infinite-scroll), [Load-more button](#load-more)

**Sources:** Jakob Nielsen 2013, *Users' Pagination Preferences and "View All"* (Users' Pagination Preferences and "View All"); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Pagination); Tim Neusesser 2022, *Infinite Scrolling: When to Use It, When to Avoid It* (Infinite Scrolling: When to Use It, When to Avoid It)

### Infinite scroll

<a id="infinite-scroll"></a>

`infinite-scroll` · also called continuous scroll, endless list

A list that loads more items by itself when the reader nears the end.

**Use when**

- Content is a stream that people browse without a specific target: posts, photos, news
- Items are similar and skimmed quickly
- Use is mostly on phones, where scrolling is the easiest gesture

**Avoid when**

- People search for a particular item or need to return to one
- The page has a footer with links people need; it keeps moving out of reach
- Keyboard and screen-reader users must get past the list; GitLab deprecated its infinite scroll component over accessibility concerns

**Rules**

- Load the next batch before the user reaches the end, and show a loading indicator at the end of the list.
- Restore the scroll position when the user opens an item and comes back.
- Offer a way to the footer content: move it to a side column or stop auto-loading after a few batches and show a "Load more" button.
- Reserve space for incoming items so nothing above the viewport shifts.
- Announce newly loaded items to screen readers and keep keyboard focus on the item the user was on.

**Seen in**

- [GitLab Pajamas](https://design.gitlab.com/components/infinite-scroll/): Infinite scroll component, now deprecated in favor of a load-more pattern or pagination
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/feed/): Feed pattern: a list that adds articles as the user scrolls
- Instagram: Home feed: posts keep loading as the user scrolls (not re-checked)

**Alternatives:** [Pagination](#pagination), [Load-more button](#load-more)

**Sources:** Tim Neusesser 2022, *Infinite Scrolling: When to Use It, When to Avoid It* (Infinite Scrolling: When to Use It, When to Avoid It); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Infinite List); GitLab, *Pajamas Design System* (Infinite scroll)

### Load-more button

<a id="load-more"></a>

`load-more` · also called show more results, view more

A button at the end of a list that adds the next batch of items below the ones already shown.

**Use when**

- People browse a list and want to keep what they have seen on screen
- The page has a footer that must stay reachable
- You want the ease of scrolling without loading content the user did not ask for

**Avoid when**

- People need to jump to a known position or a later page
- The list is a live stream where stopping to press a button gets in the way

**Rules**

- Label the button with what it does and how much is left: "Show 20 more" and "Showing 40 of 312".
- Append the new items in place, keep the scroll position, and move focus to the first new item.
- Show a loading state on the button itself while fetching.
- Reflect the loaded amount in the URL so reload and Back return to the same place.
- Remove the button when nothing is left and say so.

**Seen in**

- [GitLab Pajamas](https://design.gitlab.com/components/infinite-scroll/): Guidance to replace infinite scroll with a load-more pattern or pagination
- GitHub: Long diffs and comment threads: "Load more" between items (not re-checked)

**Alternatives:** [Pagination](#pagination), [Infinite scroll](#infinite-scroll)

**Sources:** Tim Neusesser 2022, *Infinite Scrolling: When to Use It, When to Avoid It* (Infinite Scrolling: When to Use It, When to Avoid It); Vitaly Friedman 2022, *Infinite Scroll UX Done Right: Guidelines and Best Practices* (Infinite Scroll UX Done Right)

### Step indicator

<a id="step-indicator"></a>

`step-indicator` · also called progress tracker, stepper, progress steps

A row or column of labelled steps that shows which step of a process the user is on, which are done and which remain.

**Use when**

- A process has a fixed number of steps, usually three to seven
- People want to know how much is left before they commit
- Steps have meaningful names

**Avoid when**

- The number of steps changes with the answers
- There are only two steps, or so many that the labels do not fit
- The items are peer sections, not a sequence (use tabs)

**Rules**

- Show each step with a number or icon and a text label; mark states as completed, current and upcoming with more than color.
- Expose the current step with aria-current="step" and include "Step 2 of 5" as text.
- Make completed steps links only if going back is allowed and safe; never let people jump ahead past required steps.
- On small screens collapse to "Step 2 of 5: Delivery" with a thin bar.
- Keep the indicator above the step heading, and keep its labels the same as the step headings.

**Seen in**

- [U.S. Web Design System](https://designsystem.digital.gov/components/step-indicator/): Step indicator: segments with labels and a "step x of y" counter
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/progress-indicator/guidelines): Progress indicator: steps with complete, current and incomplete states
- [Atlassian Design System](https://atlassian.design/components/progress-tracker/usage): Progress tracker: steps of a journey with visited and current states

**Alternatives:** [Wizard](#wizard), [Task list](#task-list), [Progress bar](#progress-bar)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Progress Indicator); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Goal-Gradient Effect); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Path to Completion)

### Table of contents

<a id="table-of-contents"></a>

`table-of-contents` · also called contents list, on this page, anchor links, jump links

A list of links near the top of a long page, one per section, that jump to that section.

**Use when**

- The page has several sections with headings and is longer than a few screens
- People come for one section and should not have to scroll to find it

**Avoid when**

- The page is short or has fewer than three sections
- The links would go to other pages; people expect these to stay on the page

**Rules**

- Place it after the page title and before the first section, under a heading such as "Contents" or "On this page".
- Use the exact section headings as link text and keep the same order.
- Link to heading ids so each section has a shareable URL; make Back return to where the user was.
- List one level of headings, two at most.
- For very long pages keep the list in view while scrolling (see section-nav-page).

**Seen in**

- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Articles: a "Contents" list of the section headings
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): Reference pages: "In this article" with a link per section
- [U.S. Web Design System](https://designsystem.digital.gov/components/in-page-navigation/): In-page navigation built from the headings on the page

**Alternatives:** [Long page with section navigation](#section-nav-page), [Back-to-top link](#back-to-top), [Accordion sections](#accordion-sections)

**Sources:** Huei-Hsin Wang 2023, *Table of Contents: The Ultimate Design Guide* (Table of Contents: The Ultimate Design Guide); Huei-Hsin Wang 2023, *In-Page Links for Content Navigation* (In-Page Links for Content Navigation)

### Sitemap footer

<a id="footer-sitemap"></a>

`footer-sitemap` · also called fat footer, doormat navigation, big footer

A page footer that lists links to the main areas of the site in labelled columns.

**Use when**

- The site is large and people reach the bottom of pages still looking for something
- Secondary destinations (careers, legal, contact, help) need a home on every page

**Avoid when**

- The site has a handful of pages (a one-line footer is enough)
- Lists load endlessly above it, so the footer can never be reached

**Rules**

- Group links in three to five columns under short headings that match the main navigation names.
- Put legal and utility links (privacy, terms, cookies, accessibility) in a separate last row.
- Use the same footer on every page.
- Mark it up as a footer with a nav element per group, or one labelled nav.
- Stack the columns on phones; collapse them into accordions only if the list is very long.

**Seen in**

- [GOV.UK](https://www.gov.uk/search/all?keywords=passport): Site footer: "Services and information" and "Government activity" columns of links
- [Airbnb](https://www.airbnb.com/): Site footer: Support, Hosting and Airbnb columns
- [U.S. Web Design System](https://designsystem.digital.gov/components/footer/): Footer: the "big" variant with link columns and a "Return to top" link

**Alternatives:** [Top navigation bar](#top-nav), [Mega menu](#mega-menu)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Sitemap Footer); Therese Fessenden 2019, *Web Page Footers 101: Design Patterns and When to Use Each* (Web Page Footers 101: Design Patterns and When to Use Each)

### Search as navigation

<a id="search-navigation"></a>

`search-navigation` · also called site search, search-first navigation, global search

A search box offered as a main way to reach content, on every page or as the centerpiece of the home page.

**Use when**

- The site has more content than menus can list
- People arrive knowing the name of what they want
- Content is added faster than the navigation can be reorganized

**Avoid when**

- The site is small enough to browse
- Search quality is poor; a prominent box that returns bad results is worse than none
- People do not know the words to search for and need to see categories

**Rules**

- Show an open text field, not only an icon, on screens that have room.
- Put it where people look for it: in the header toward the end, or centered on a search-led home page.
- Suggest matching pages and queries as the user types, and let Enter run the full search.
- Keep the query in the field on the results page so it can be refined.
- Keep browse navigation as well; search complements it and does not replace it.
- Mark the form up with role="search" and give the field a label.

**Seen in**

- [GOV.UK](https://www.gov.uk/): Home page: a large search field in the page header band, above the list of topics
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Site header: an open search field with a Search button
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/searching): Searching: guidance on search fields, suggestions and scopes

**Alternatives:** [Top navigation bar](#top-nav), [Command palette](#command-palette), [Mega menu](#mega-menu)

**Sources:** Jakob Nielsen 2001, *Search: Visible and Simple* (Search: Visible and Simple); Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (Street signs and Breadcrumbs); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Feature, Search, and Browse)

### Command palette

<a id="command-palette"></a>

`command-palette` · also called quick switcher, command menu, launcher

A search box that opens over the page with a keyboard shortcut and lists matching pages and commands to run.

**Use when**

- The product has many commands and destinations and frequent users who prefer the keyboard
- People know what they want by name but not where it lives in the menus

**Avoid when**

- Users are occasional visitors who will never learn a shortcut
- It would be the only way to reach a feature; it is an accelerator, not the navigation

**Rules**

- Open with a documented shortcut (commonly Ctrl/Cmd+K) and also from a visible search control.
- Focus the input on open; filter as the user types; show recent or suggested items before typing.
- Up and Down move through results, Enter runs the selected one, Escape closes and returns focus.
- Group results by type (pages, commands, people) and show each command's own shortcut beside it.
- Build as a modal dialog containing a combobox with a listbox of results.
- Match loosely: accept partial words and common synonyms.

**Seen in**

- [GitHub](https://docs.github.com/en/get-started/accessibility/github-command-palette): GitHub Command Palette: navigate, search and run commands from the keyboard
- [Visual Studio Code](https://code.visualstudio.com/docs/editing/getting-started/userinterface): Command Palette: access to every command by typing its name
- [Grafana](https://play.grafana.org/): Header: a search control labelled with its Cmd+K shortcut
- [shadcn/ui](https://ui.shadcn.com/docs/components/base/command): Command: a command menu component

**Alternatives:** [Search as navigation](#search-navigation), [Sidebar navigation](#sidebar-nav), [Dropdown menu](#dropdown-menu)

**Sources:** Jakob Nielsen 1994, *10 Usability Heuristics for User Interface Design* (Flexibility and efficiency of use); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Combobox pattern); GitHub, *Primer Design System* (Navigation)

### View switcher

<a id="view-switcher"></a>

`view-switcher` · also called alternative views, layout switcher, content switcher

A small control that switches the same set of items between different presentations, such as list, grid, board or calendar.

**Use when**

- The same data is useful in more than one arrangement
- Different users or tasks prefer different arrangements

**Avoid when**

- One presentation is clearly right for the data
- The options change which items are shown rather than how (that is a filter or a tab)

**Rules**

- Offer two to five views in one segmented control, placed at the top of the list near sort and filter.
- Label each option with text, or with an icon that has an accessible name and a tooltip.
- Keep selection, filters, sort and scroll position when the view changes.
- Remember the chosen view per user and per list.
- Mark up as a radio group or a group of toggle buttons with aria-pressed; arrow keys move between options.

**Seen in**

- [Notion](https://www.notion.com/help/views-filters-and-sorts): Databases: the same items as a table, board, calendar, list, gallery or timeline
- [GitHub](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/changing-the-layout-of-a-view): Projects: switch a view between table, board and roadmap layouts
- [Google Calendar](https://support.google.com/calendar/answer/6110849?hl=en): Calendar: day, week and month views
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/content-switcher/guidelines): Content switcher: toggles between alternate views of the same content

**Alternatives:** [Navigation tabs](#nav-tabs), [Tabbed sections](#tabbed-sections), [Segmented control](#segmented-control)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Alternative Views); Apple, *Human Interface Guidelines* (Segmented controls); IBM, *Carbon Design System* (Content switcher)

### Back-to-top link

<a id="back-to-top"></a>

`back-to-top` · also called scroll to top, return to top

A link or button that returns the reader to the start of a long page.

**Use when**

- The page is long: NN/g suggests more than about four screens
- The navigation is at the top and is not sticky

**Avoid when**

- The page is short
- A sticky header already keeps navigation in view

**Rules**

- Label it with words, "Back to top", with or without an up arrow.
- Place it at the bottom right as a small floating button, or as a link in the footer; show a floating one only after the user has scrolled down.
- Keep it small and never over content the user needs to tap.
- Scroll quickly or jump; respect prefers-reduced-motion.
- Move keyboard focus to the top of the page as well as the scroll position.

**Seen in**

- [U.S. Web Design System](https://designsystem.digital.gov/components/footer/): Footer: a "Return to top" link
- [GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository): GitHub Docs articles: a "Back to top" link at the end of the page
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Articles: "(Top)" as the first entry of the contents list

**Alternatives:** [Sticky header](#sticky-header), [Table of contents](#table-of-contents)

**Sources:** Hoa Loranger 2017, *Back-to-Top Button Design Guidelines* (Back-to-Top Button Design Guidelines)

## Inputs and form controls

<a id="input"></a>

### Text field

<a id="text-field"></a>

`text-field` · also called text input, text box, single-line input

A box where the user types one line of text.

**Use when**

- The answer is short free text: a name, an email address, a number, a reference
- The possible answers cannot be listed in advance

**Avoid when**

- The answer is one of a known set (use radios, a select or a combobox)
- The answer runs to several lines (use a textarea)

**Rules**

- Give every field a visible label above it, linked with for and id; never use the placeholder as the label.
- Size the field to the expected answer: a postcode field is short, an email field is wide.
- Set type, inputmode and autocomplete to match the content (for example type="email", inputmode="numeric", autocomplete="given-name").
- Accept input in any reasonable format (spaces, dashes, upper or lower case) and clean it up yourself.
- Show hint text between label and field and link it with aria-describedby.
- Make the field at least 44 px tall on touch screens and show a clear focus outline.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/text-input/): Text input: labels, hints, fixed and fluid widths, numeric inputs
- [Material Design 3](https://m3.material.io/components/text-fields/guidelines): Text fields: filled and outlined, with label and supporting text
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/text-fields): Text fields
- [U.S. Web Design System](https://designsystem.digital.gov/components/text-input/): Text input

**Alternatives:** [Textarea](#textarea), [Select](#select), [Combobox](#combobox)

**Sources:** Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Input Fields); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Forgiving Format); Government Digital Service, *GOV.UK Design System* (Text input)

### Textarea

<a id="textarea"></a>

`textarea` · also called multi-line text field, text area

A taller box where the user types several lines of text.

**Use when**

- The answer is free text longer than one sentence: a message, a description, a comment
- Line breaks in the answer should be kept

**Avoid when**

- The answer is short and single-line (use a text field)
- The text needs formatting such as headings or lists (use a rich text editor)

**Rules**

- Set the height to the expected length (at least three lines) and let it grow or be resized vertically.
- If there is a length limit, show a live count of characters remaining under the field and allow typing past the limit, with an error, rather than cutting text off.
- Announce the remaining count to screen readers politely, not on every keystroke.
- Do not submit on Enter; Enter adds a line break.
- Keep the label above and the hint below the label, as for a text field.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/textarea/): Textarea: for answers longer than a single line
- [GOV.UK Design System](https://design-system.service.gov.uk/components/character-count/): Character count: tells users how many characters remain
- [Atlassian Design System](https://atlassian.design/components/textarea/usage): Text area

**Alternatives:** [Text field](#text-field)

**Sources:** Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Input Fields); Government Digital Service, *GOV.UK Design System* (Character count)

### Select

<a id="select"></a>

`select` · also called dropdown, drop-down list, pop-up button, picker

A closed control that opens a list from which the user picks one option.

**Use when**

- There are roughly 5 to 15 options and space is limited
- The options are familiar so the user does not need to see them all to decide
- A default is right for most people

**Avoid when**

- There are four or fewer options (use radios so they are all visible)
- There are so many options that scrolling is slow (use a combobox)
- Typing is faster than picking, as with a birth year

**Rules**

- Use the native select element unless you need search or rich options; it works with every keyboard, screen reader and phone.
- Label it like any field; do not put the label inside as the first option.
- Order options in a way users expect: alphabetical, numeric or by frequency.
- Start with a real default when one exists; otherwise start with an empty "Select…" option and validate.
- Do not submit or navigate as soon as an option is chosen.
- For multiple choice use checkboxes, not a multi-select list.

**Seen in**

- [GOV.UK](https://www.gov.uk/check-uk-visa/y): Question page: a select with the list of nationalities
- [GOV.UK Design System](https://design-system.service.gov.uk/components/select/): Select: to be used as a last resort in public-facing services
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons): Pop-up buttons: choose one of a list of mutually exclusive options
- [U.S. Web Design System](https://designsystem.digital.gov/components/select/): Select

**Alternatives:** [Radio group](#radio-group), [Combobox](#combobox), [Segmented control](#segmented-control)

**Sources:** Anna Kaley 2020, *Listboxes vs. Dropdown Lists* (Listboxes vs. Dropdown Lists); Lars Söderlund 2018, *Drop-Down Usability: When You Should (and Shouldn't) Use Them* (Drop-Down Usability); Luke Wroblewski 2015, *Dropdowns Should be the UI of Last Resort* (Dropdowns Should be the UI of Last Resort)

### Combobox

<a id="combobox"></a>

`combobox` · also called autocomplete, typeahead, searchable select, autosuggest

A text field that shows a list of matching options as the user types, to pick from.

**Use when**

- There are many options: USWDS suggests more than about 15
- Users know the name of what they want: a country, a person, a product
- Options come from a search or a server

**Avoid when**

- There are few options (radios or a select show them without typing)
- Users cannot guess what to type and need to see the choices

**Rules**

- Follow the ARIA combobox pattern: the input has role="combobox" with aria-expanded and aria-controls; the list is a listbox.
- Down arrow opens the list and moves through options, Enter selects, Escape closes; typing keeps filtering.
- Match anywhere in the option and tolerate typos; highlight the matching part.
- Show about 10 suggestions at most and say "No results" when nothing matches.
- State whether free text is allowed; if only listed values are valid, validate on blur.
- Announce the number of available results to screen readers.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): Combobox pattern with list, grid and dialog popups
- [U.S. Web Design System](https://designsystem.digital.gov/components/combo-box/): Combo box: for lists of more than 15 options
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/auto-suggest-box): Auto-suggest box
- [shadcn/ui](https://ui.shadcn.com/docs/components/base/combobox): Combobox component

**Alternatives:** [Select](#select), [Search field](#search-field), [Tag input](#tag-input)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Autocompletion); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Combobox pattern); Edward Scott 2022, *9 UX Best Practice Design Patterns for Autocomplete Suggestions (Only 19% Get Everything Right)* (9 UX Best Practice Design Patterns for Autocomplete Suggestions)

### Radio group

<a id="radio-group"></a>

`radio-group` · also called radio buttons, option buttons

A visible list of options from which the user picks exactly one.

**Use when**

- The user picks one of two to about five options
- Seeing every option helps the user decide
- The choice is sent with a form

**Avoid when**

- The user may pick more than one (use checkboxes)
- There are many options (use a select or combobox)
- The choice is a single yes/no with an obvious off state (a checkbox may do)

**Rules**

- Stack options vertically, one per line, with the circle to the left of its label.
- Wrap the group in a fieldset with a legend that asks the question.
- Make the label clickable and the target at least 44 px tall.
- Preselect an option only when it is a safe, expected default; GOV.UK advises never preselecting, so that an unanswered question is noticed.
- Add "None of these" or "I don't know" as an option rather than expecting the user to leave the group empty.
- One Tab stop for the group; arrow keys move between options.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/radios/): Radios: stacked options, hints, conditionally revealed fields
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Appearance panel: Text, Width and Color each offered as a short radio group
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/radio/): Radio group pattern
- [Material Design 3](https://m3.material.io/components/radio-button/guidelines): Radio button

**Alternatives:** [Select](#select), [Segmented control](#segmented-control), [Checkbox group](#checkbox-group)

**Sources:** Jakob Nielsen 2004, *Checkboxes vs. Radio Buttons* (Checkboxes vs. Radio Buttons); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs); Government Digital Service, *GOV.UK Design System* (Radios)

### Checkbox

<a id="checkbox"></a>

`checkbox` · also called tick box, check box

A box that the user ticks to say yes to one statement; the answer is applied when the form is saved.

**Use when**

- One yes/no choice is sent with a form: "Remember me", "I agree to the terms"
- The choice needs an explicit confirmation step, such as Save

**Avoid when**

- The change takes effect immediately (use a switch)
- The two states are not yes/no, for example "Monthly" and "Yearly" (use radios)

**Rules**

- Write the label as a positive statement that is true when ticked; avoid negatives such as "Don't send".
- Put the box to the left of the label and make the label clickable.
- Leave consent and marketing boxes unticked by default.
- Use the native input type="checkbox"; Space toggles it.
- Use the indeterminate state only for a parent whose children are partly selected.

**Seen in**

- [Salesforce](https://login.salesforce.com/): Sign-in form: a "Remember me" checkbox under the Log In button
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/): Checkbox pattern: two-state and tri-state
- [Material Design 3](https://m3.material.io/components/checkbox/guidelines): Checkbox
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/checkbox/guidelines): Checkbox

**Alternatives:** [Switch](#switch), [Toggle button](#toggle-button), [Radio group](#radio-group)

**Sources:** Jakob Nielsen 2004, *Checkboxes vs. Radio Buttons* (Checkboxes vs. Radio Buttons); Alita Kendrick 2018, *Toggle-Switch Guidelines* (Toggle-Switch Guidelines); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs)

### Checkbox group

<a id="checkbox-group"></a>

`checkbox-group` · also called multiple choice, checkboxes

A visible list of options from which the user ticks any number, including none.

**Use when**

- The user may choose several of a short list of options
- Each option is independent of the others

**Avoid when**

- Only one option may be chosen (use radios)
- The list is long (use a tag input or a filterable list)

**Rules**

- Stack options vertically inside a fieldset whose legend asks the question; add the hint "Select all that apply".
- When "none" is a valid answer, offer it as a last option, visually separated, that unticks the others.
- Order options by what users expect; alphabetical when there is no better order.
- For a long list add "Select all" as a tri-state parent checkbox.
- Each checkbox is its own Tab stop; Space toggles.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/checkboxes/): Checkboxes: "Select all that apply" and a "none" option
- [U.S. Web Design System](https://designsystem.digital.gov/components/checkbox/): Checkbox: default and tile variants in a fieldset
- [GitHub Primer](https://primer.style/product/components/checkbox-group/): CheckboxGroup

**Alternatives:** [Tag input](#tag-input), [Radio group](#radio-group), [Combobox](#combobox)

**Sources:** Jakob Nielsen 2004, *Checkboxes vs. Radio Buttons* (Checkboxes vs. Radio Buttons); Government Digital Service, *GOV.UK Design System* (Checkboxes); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (List Builder)

### Switch

<a id="switch"></a>

`switch` · also called toggle, toggle switch

A control that turns one setting on or off, and takes effect at once.

**Use when**

- The change applies immediately, without a Save button
- The setting has two clear states: on and off
- The setting sits in a list of settings

**Avoid when**

- The choice only applies after the form is submitted (use a checkbox)
- The two options are not on/off, such as "List" and "Grid" (use a segmented control)
- Turning it on starts something that needs more input or confirmation

**Rules**

- Label the setting, not the state: "Wi-Fi", not "Turn Wi-Fi on".
- Apply the change within about 0.1 s; if it has to be saved to a server, show progress and roll back with a message on failure.
- Show the state by position and by more than color, for example a tick or I/O marks.
- Use a button or checkbox input with role="switch" and aria-checked; Space toggles.
- Put the switch at the trailing end of its row and make the whole row the tap target.
- Do not mix switches and checkboxes for the same kind of setting on one screen.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/toggles): Toggles: the switch style in list rows
- [Material Design 3](https://m3.material.io/components/switch/guidelines): Switch
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/toggle/guidelines): Toggle: for binary actions that occur immediately
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/switch/): Switch pattern

**Alternatives:** [Checkbox](#checkbox), [Toggle button](#toggle-button), [Segmented control](#segmented-control)

**Sources:** Alita Kendrick 2018, *Toggle-Switch Guidelines* (Toggle-Switch Guidelines); Apple, *Human Interface Guidelines* (Toggles); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Switch pattern)

### Segmented control

<a id="segmented-control"></a>

`segmented-control` · also called segmented button, button group selector, pill switcher

A row of two to five joined buttons of which exactly one is selected.

**Use when**

- The user picks one of two to five short options and all should be visible
- The choice takes effect at once: a view, a unit, a time range
- Space is horizontal, such as a toolbar

**Avoid when**

- Labels are long or there are more than five options (use a select or radios)
- The options are actions rather than a choice
- The choice is part of a long form (radios read better stacked)

**Rules**

- Give all segments the same width and short labels of one or two words; use icons only when their meaning is certain.
- Always have exactly one segment selected and show it with a filled background, not color alone.
- Mark up as a radio group, or as buttons with aria-pressed; arrow keys move the selection.
- Do not let segments wrap; on narrow screens switch to a select.
- Keep the set of options fixed; do not hide or disable segments depending on context.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/segmented-controls): Segmented controls: a set of segments, each working as a button
- [Material Design 3](https://m3.material.io/components/segmented-buttons/guidelines): Segmented button: two to five segments, single-select or multi-select
- [GitHub Primer](https://primer.style/product/components/segmented-control/): SegmentedControl
- [GitLab Pajamas](https://design.gitlab.com/components/segmented-control/): Segmented control

**Alternatives:** [Radio group](#radio-group), [Select](#select), [Switch](#switch), [View switcher](#view-switcher)

**Sources:** Apple, *Human Interface Guidelines* (Segmented controls); Google, *Material Design 3* (Segmented button); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs)

### Toggle button

<a id="toggle-button"></a>

`toggle-button` · also called pressed button, latching button, state button

A button that stays pressed to show that something is on, and is released by pressing it again.

**Use when**

- A state applies to the current object and lives in a toolbar: bold, mute, favorite, pin
- The control is small or icon-only and a switch would not fit

**Avoid when**

- The setting belongs in a settings list (use a switch)
- The label would have to change between two verbs and it is unclear whether it shows the state or the action

**Rules**

- Keep the label constant and show the state with the pressed look: "Mute" pressed, not a label that flips between "Mute" and "Unmute".
- Set aria-pressed="true" or "false" on a real button element.
- Show pressed with a clear fill or inset, plus an icon change where possible (outline heart to filled heart).
- Give icon-only toggles an accessible name and a tooltip.
- Apply the change at once and make it reversible by the same button.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/button/): Button pattern: toggle buttons with aria-pressed
- [Material Design 3](https://m3.material.io/components/icon-buttons/guidelines): Icon buttons: default and toggle variants
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/toggles): Toggles: buttons that behave like toggles

**Alternatives:** [Switch](#switch), [Checkbox](#checkbox), [Segmented control](#segmented-control)

**Sources:** Heydon Pickering 2019, *Inclusive Components* (Toggle Buttons); Raluca Budiu 2020, *State-Switch Controls: The Case of the "Mute" Button* (State-Switch Controls: The Case of the "Mute" Button); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs)

### Slider

<a id="slider"></a>

`slider` · also called range input, range slider

A handle on a track that the user drags to pick a value from a range.

**Use when**

- An approximate value is enough: volume, brightness, zoom
- The effect of the value is visible while dragging
- The range is bounded and its ends are meaningful

**Avoid when**

- An exact value matters, such as a price or a quantity; NN/g notes that hitting a precise value with a slider is hard
- The range is very large or unbounded

**Rules**

- Show the current value as text next to the handle and label both ends of the track.
- Pair it with a number field when users may want an exact value.
- Make the handle at least 44 px to grab and let users tap the track to jump.
- Use input type="range" or role="slider" with aria-valuemin, aria-valuemax, aria-valuenow; arrows step, Home and End jump to the ends.
- Apply the value live while dragging when it is cheap, on release when it is not.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/slider/): Slider pattern
- [Material Design 3](https://m3.material.io/components/sliders/guidelines): Sliders
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sliders): Sliders
- [U.S. Web Design System](https://designsystem.digital.gov/components/range-slider/): Range slider

**Alternatives:** [Number stepper](#number-stepper), [Text field](#text-field)

**Sources:** Aurora Harley 2015, *Slider Design: Rules of Thumb* (Slider Design: Rules of Thumb); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Slider pattern)

### Number stepper

<a id="number-stepper"></a>

`number-stepper` · also called input stepper, spin button, quantity selector, number input

A number shown between minus and plus buttons that change it by one step.

**Use when**

- The value is a small whole number that is adjusted by a few steps: quantity, guests, copies
- A sensible default exists and most people stay near it

**Avoid when**

- Values are large or vary widely (typing is faster)
- The value is not a quantity: phone numbers, card numbers, years

**Rules**

- Show the value between the two buttons, with the minus on the left and plus on the right, each at least 44 px.
- Let the user also type the value; the field uses inputmode="numeric".
- Disable minus at the minimum and plus at the maximum, and state the limits when they are not obvious.
- Give the buttons accessible names such as "Decrease quantity".
- Use role="spinbutton" semantics: Up and Down arrows change the value.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/steppers): Steppers: a two-segment control for increasing or decreasing a value
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/number-input/guidelines): Number input
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/): Spinbutton pattern
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/number-box): Number box

**Alternatives:** [Slider](#slider), [Text field](#text-field), [Select](#select)

**Sources:** Yuxuan (Tammy) Zhou 2018, *Design Guidelines for Input Steppers* (Design Guidelines for Input Steppers); Edward Scott 2022, *Use Buttons or Buttons Plus an Open Text Field for Updating Cart Quantity (61% Don’t)* (Use Buttons or Buttons Plus an Open Text Field for Updating Cart Quantity)

### Date picker

<a id="date-picker"></a>

`date-picker` · also called calendar picker, calendar

A field that opens a calendar from which the user chooses a day or a range of days.

**Use when**

- The date is near today and the weekday or the surrounding days matter: bookings, deadlines, schedules
- The user chooses a range
- Some days are unavailable and that should be visible

**Avoid when**

- The date is known by heart or far from today, such as a date of birth (use text fields)
- Only a month or year is needed

**Rules**

- Always allow typing the date in the field as well as picking it; state the expected format in a hint.
- Open on the most likely month, show today, and show unavailable days as disabled rather than hiding them.
- For ranges show two months side by side on wide screens and highlight the days between start and end.
- Offer month and year jumps, not only previous and next arrows.
- Build the popup as a dialog containing a grid: arrow keys move by day, Page Up and Page Down by month, Escape closes.
- Use the locale's first day of the week and date order.

**Seen in**

- [Material Design 3](https://m3.material.io/components/date-pickers/guidelines): Date pickers: docked, modal and modal date input
- [U.S. Web Design System](https://designsystem.digital.gov/components/date-picker/): Date picker: a text field with a calendar button
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/date-picker/guidelines): Date picker: simple, single and range

**Alternatives:** [Date text input](#date-text-input), [Select](#select)

**Sources:** Angie Li 2017, *Date-Input Form Fields: UX Design Guidelines* (Date-Input Form Fields: UX Design Guidelines); Vitaly Friedman 2017, *Designing The Perfect Date And Time Picker* (Designing The Perfect Date And Time Picker); Government Digital Service, *GOV.UK Design System* (Ask users for dates)

### Date text input

<a id="date-text-input"></a>

`date-text-input` · also called memorable date, day month year fields

Three short text fields, for day, month and year, in which the user types a date they already know.

**Use when**

- The date is known by heart or copied from a document: date of birth, issue date, expiry date
- The date may be many years from today

**Avoid when**

- The user has to choose a date in relation to today or to a weekday (use a date picker)
- An approximate date is all the user can give

**Rules**

- Use three fields labelled Day, Month and Year, in the order of the locale, inside a fieldset whose legend asks for the date.
- Give an example in the hint, for example "For example, 27 3 2007".
- Use inputmode="numeric" and do not auto-advance focus between fields.
- Accept month names and one- or two-digit days and months.
- When the date is wrong, say which part: "Date of birth must include a year".
- Add autocomplete="bday-day", "bday-month" and "bday-year" for a date of birth.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/date-input/): Date input: for a memorable date or one that can be looked up
- [U.S. Web Design System](https://designsystem.digital.gov/components/memorable-date/): Memorable date: three fields for month, day and year
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/dates/): Ask users for dates pattern

**Alternatives:** [Date picker](#date-picker), [Text field](#text-field)

**Sources:** Government Digital Service, *GOV.UK Design System* (Date input); Angie Li 2017, *Date-Input Form Fields: UX Design Guidelines* (Date-Input Form Fields: UX Design Guidelines); Adam Silver 2018, *Form Design Patterns* (A Flight Booking Form)

### File upload

<a id="file-upload"></a>

`file-upload` · also called drop zone, file input, uploader

A control for choosing files from the device, by a button or by dragging them onto an area.

**Use when**

- The user must supply a document, image or other file
- Several files may be added at once

**Avoid when**

- The content could be typed or pasted more easily
- The user is unlikely to have the file on the current device, and no alternative is offered

**Rules**

- Always provide a button that opens the file chooser; a drop area is an addition, never the only way.
- State accepted types, size limit and number of files before the user chooses.
- After choosing, list each file with name, size, progress and a Remove button.
- Show errors per file and keep the files that succeeded.
- Highlight the drop area while a file is dragged over the page.
- Use a native input type="file" under the styling so it works with keyboard and screen readers.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/file-upload/): File upload: a "Choose file" button and a drop area
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/forms/drop-zone): Drop zone
- [GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository): Upload files to a repository by dragging them into the browser or choosing them
- [Google Drive](https://support.google.com/drive/answer/2424368?hl=en): Upload by dragging files into a Drive folder

**Alternatives:** [Text field](#text-field), [Drag and drop](#drag-and-drop)

**Sources:** Adam Silver 2018, *Form Design Patterns* (An Upload Form); Page Laubheimer 2020, *Drag–and–Drop: How to Design for Ease of Use* (Drag–and–Drop: How to Design for Ease of Use); Government Digital Service, *GOV.UK Design System* (File upload)

### Search field

<a id="search-field"></a>

`search-field` · also called search box, search input

A text field for entering words to find, with a search icon or button.

**Use when**

- The collection is too large to scan
- People know words that identify what they want

**Avoid when**

- The list is short enough to read
- The field would only filter what is already visible (label it "Filter")

**Rules**

- Show it open on wide screens; an icon alone is found less often.
- Make it wide enough to show a typical query without scrolling inside the field.
- Label it for assistive technology and put it inside a search landmark; a placeholder such as "Search products" may supplement the label.
- Submit on Enter and with a visible button; show a clear (×) button once there is text.
- Use type="search" and keep the query in the field on the results page.
- If results update while typing, wait for a short pause before fetching and announce the result count.

**Seen in**

- [GOV.UK](https://www.gov.uk/): Home page: a labelled search field with a search button
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/search-fields): Search fields: Search icon, Clear button and placeholder text
- [Material Design 3](https://m3.material.io/components/search/guidelines): Search bar and search view
- [U.S. Web Design System](https://designsystem.digital.gov/components/search/): Search: big, default and small variants

**Alternatives:** [Combobox](#combobox), [Command palette](#command-palette)

**Sources:** Jakob Nielsen 2001, *Search: Visible and Simple* (Search: Visible and Simple); Adam Silver 2018, *Form Design Patterns* (A Search Form); Kate Moran 2018, *Site Search Suggestions* (Site Search Suggestions)

### Tag input

<a id="tag-input"></a>

`tag-input` · also called token field, chip input, multi-select combobox, tag picker

A text field in which each chosen value turns into a removable chip, so several values can be entered.

**Use when**

- The user picks several values from a long list: recipients, labels, skills
- Values may be new ones that the user types

**Avoid when**

- There are few options (checkboxes show them all)
- Only one value is allowed (use a combobox)

**Rules**

- Suggest matching values while typing; Enter or comma adds the highlighted one as a chip.
- Give each chip a remove button with an accessible name ("Remove Design"); Backspace in an empty field removes the last chip.
- Let the field grow in height as chips wrap; never hide chosen values behind "+3".
- Prevent duplicates and say why when one is rejected.
- Keep chips reachable by keyboard with arrow keys and announce additions and removals.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/token-fields): Token fields: Mail turns each recipient into a token
- [GitHub Primer](https://primer.style/product/components/text-input-with-tokens/): TextInputWithTokens
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/tagpicker/usage): Tag picker

**Alternatives:** [Checkbox group](#checkbox-group), [Combobox](#combobox)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (List Builder); Apple, *Human Interface Guidelines* (Token fields); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Combobox pattern)

### Rating input

<a id="rating"></a>

`rating` · also called star rating

A row of symbols, usually five stars, on which the user chooses a score.

**Use when**

- People give a quick opinion on a simple scale
- The same scale is shown back as an average

**Avoid when**

- The answer needs words or several dimensions
- The scale has more points than can be shown as symbols

**Rules**

- Use five symbols unless there is a reason not to, and label the ends when the meaning is not obvious.
- Show the chosen value as text as well ("4 out of 5").
- Build as a radio group so arrow keys change the value; each option has a name such as "3 stars".
- Let the user change or clear the rating.
- Keep display-only ratings visibly different from the input and do not make them focusable.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/rating-indicators): Rating indicators
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/rating/usage): Rating
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/rating): Rating control

**Alternatives:** [Radio group](#radio-group), [Slider](#slider)

**Sources:** Apple, *Human Interface Guidelines* (Rating indicators); Microsoft, *Fluent 2 Design System* (Rating)

### Password field

<a id="password-field"></a>

`password-field` · also called password input, show/hide password

A text field that hides what is typed, with a button to show it.

**Use when**

- The user creates or enters a password
- Another secret, such as an API key, is typed where others might see the screen

**Avoid when**

- The value is a one-time code (use a one-time code field)
- The value is not secret; hiding it only causes typing errors

**Rules**

- Add a "Show" / "Hide" button that switches the field between type="password" and type="text".
- Allow paste and password managers; set autocomplete="current-password" or "new-password".
- Ask for a new password once, not twice, when a show button is present.
- State password rules before the user types and show which are met as they type.
- Do not set a short maximum length and do not forbid spaces or symbols.
- Return the field to hidden when the form is submitted.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/password-input/): Password input with a show/hide button
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/passwords/): Ask users for passwords pattern
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/forms/password-field): Password field
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/password-box): Password box with a reveal button

**Alternatives:** [Text field](#text-field), [One-time code field](#one-time-code)

**Sources:** Jakob Nielsen 2009, *Stop Password Masking* (Stop Password Masking); Luke Wroblewski 2012, *Mobile Design Details: Hide/Show Passwords* (Mobile Design Details: Hide/Show Passwords); Sam Dutton 2020, *Sign-in form best practices* (Sign-in form best practices)

### One-time code field

<a id="one-time-code"></a>

`one-time-code` · also called OTP input, verification code, PIN input

A field for typing the short code sent by text message, email or an authenticator app.

**Use when**

- A sign-in or payment needs a second factor
- A phone number or email address has to be confirmed

**Avoid when**

- The secret is a password the user chose (use a password field)

**Rules**

- Use one text input with inputmode="numeric" and autocomplete="one-time-code" so phones offer the code from the message.
- If the design shows one box per digit, it must still accept a pasted or auto-filled whole code and Backspace across boxes.
- Say where the code was sent and how long it is valid.
- Offer "Send a new code" after a short wait, and another method.
- Do not mask the code; accept spaces and dashes.
- Submit automatically only when the last digit arrives from autofill or paste, never mid-typing.

**Seen in**

- [web.dev](https://web.dev/articles/sms-otp-form): SMS OTP form best practices: one input with autocomplete="one-time-code"
- [Apple iOS](https://support.apple.com/guide/iphone/automatically-fill-in-sms-passcodes-iphc89a3a3af/ios): iPhone offers codes from messages above the keyboard
- [shadcn/ui](https://ui.shadcn.com/docs/components/base/input-otp): Input OTP component

**Alternatives:** [Password field](#password-field), [Text field](#text-field)

**Sources:** Eiji Kitamura 2020, *SMS OTP form best practices* (SMS OTP form best practices); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Accessible Authentication (Minimum))

### Inline edit

<a id="inline-edit"></a>

`inline-edit` · also called edit in place, click to edit

A displayed value that turns into a field when clicked, so it can be changed where it is shown.

**Use when**

- People often change one value at a time while reading the page: a title, a status, a cell
- The value is short and can be validated on its own

**Avoid when**

- Several values must change together or be validated together (use an edit form)
- The change is risky or hard to undo
- Most visitors only read and editing must not be triggered by accident

**Rules**

- Signal that the value is editable: a pencil icon or hover outline, and a focusable control for keyboard users.
- Swap to a field of the same size in the same place, with the old value selected.
- Enter or the tick button saves, Escape or the cross cancels and restores the old value.
- State what happens on blur and keep to it: either save or cancel, the same everywhere.
- Show saving and saved states next to the field, and keep the field open with a message if saving fails.

**Seen in**

- [Atlassian Design System](https://atlassian.design/components/inline-edit/usage): Inline edit: switches between reading and editing on the same page
- Trello: Card titles and list names become editable when clicked (not re-checked)
- Jira: Issue fields are edited in place on the issue view (not re-checked)

**Alternatives:** [Modal dialog](#modal-dialog), [Side sheet](#side-sheet), [Text field](#text-field)

**Sources:** Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (In-Page Editing); Atlassian, *Atlassian Design System* (Inline edit)

### Label above field

<a id="label-top"></a>

`label-top` · also called top-aligned label, stacked label

The field's label sits on its own line directly above the field.

**Use when**

- Almost always: it is the fastest to complete and works at any width
- Labels vary in length or will be translated
- The form must work on phones

**Avoid when**

- Vertical space is very tight and labels are short (left-aligned labels save height)

**Rules**

- Place the label directly above the field with a small gap, and a larger gap between one field group and the next.
- Keep the label visible while the user types; link it with for and id.
- Write labels as short nouns or questions in sentence case, without a trailing colon.
- Put hint text between the label and the field.
- Use one column of fields.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/text-input/): Text input: label above the field, hint between label and field
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms): Forms pattern: top-aligned labels are the default and only arrangement
- [Salesforce](https://login.salesforce.com/): Sign-in form: "Username" label above its field

**Alternatives:** [Label beside field](#label-left), [Floating label](#label-floating), [Placeholder as label](#label-placeholder-only)

**Sources:** Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Labels); Luke Wroblewski 2007, *Top, Right or Left Aligned Form Labels* (Top, Right or Left Aligned Form Labels); Edward Scott 2023, *Avoid Extensive Multicolumn Layouts* (Avoid Extensive Multicolumn Layouts)

### Label beside field

<a id="label-left"></a>

`label-left` · also called left-aligned label, inline label, horizontal form

The label sits to the left of its field on the same line.

**Use when**

- The form is dense, used by experts on wide screens, and vertical space is scarce
- Users scan the labels to find one field to change, as in a settings panel

**Avoid when**

- The screen is narrow
- Labels differ much in length or are translated
- Speed of completion matters most; Wroblewski reports top labels are completed faster

**Rules**

- Give all labels one column width, sized to the longest label, and keep the gap to the field small.
- Right-align labels to keep them close to their fields, or left-align them when scanning the labels matters more.
- Switch to labels above the fields below about 600 px.
- Align the label's text baseline with the field's text.

**Seen in**

- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/field/usage): Field: vertical and horizontal label alignment, with a caution about left-aligned labels
- Apple macOS: System and app settings windows: right-aligned labels to the left of their controls (not re-checked)

**Alternatives:** [Label above field](#label-top), [Floating label](#label-floating)

**Sources:** Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Labels); Luke Wroblewski 2007, *Top, Right or Left Aligned Form Labels* (Top, Right or Left Aligned Form Labels); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Fill-in-the-Blanks)

### Floating label

<a id="label-floating"></a>

`label-floating` · also called float label, label inside field

The label starts inside the empty field and shrinks to the top edge of the field when the user types.

**Use when**

- Vertical space is tight and the design system already provides the component
- The form is short, such as sign-in or payment card details

**Avoid when**

- Fields need hint text or examples; there is no room for them
- Labels are long or translated and would be cut off when small
- Empty fields must be easy to tell from filled ones at a glance

**Rules**

- Keep the floated label at a readable size (12 px or more) with full contrast.
- Use a real label element, not the placeholder attribute.
- Do not also show a placeholder; it collides with the resting label.
- Make the field tall enough (about 56 px) to hold label and value without crowding.
- Float the label for autofilled values too.

**Seen in**

- [Material Design 3](https://m3.material.io/components/text-fields/guidelines): Text fields: label text sits in the empty field and moves up when populated
- [Stripe](https://docs.stripe.com/elements/appearance-api): Elements Appearance API: a "floating" labels option for payment fields

**Alternatives:** [Label above field](#label-top), [Label beside field](#label-left), [Placeholder as label](#label-placeholder-only)

**Sources:** Google, *Material Design 3* (Text fields); Adam Silver 2017, *The problem with float labels and what to do instead* (The problem with float labels and what to do instead); Katie Sherwin 2014, *Placeholders in Form Fields Are Harmful* (Placeholders in Form Fields Are Harmful)

### Placeholder as label

<a id="label-placeholder-only"></a>

`label-placeholder-only` · also called placeholder-only label, inline label

The only description of a field is grey text inside it, which disappears when the user types. Listed here as an anti-pattern.

**Use when**

- Only for a single search field whose purpose is obvious from an icon and a button
- And only if that field still has an accessible name from a hidden label or aria-label

**Avoid when**

- Any form with more than one field
- The field needs a format hint or will be reviewed before submitting
- Users rely on autofill, translation or screen readers

**Rules**

- Replace it with a visible label above the field.
- If the field truly stands alone, give it aria-label or a visually hidden label; the placeholder attribute is not a label.
- Never put instructions or formats only in the placeholder; put them in hint text.
- Placeholder text needs 4.5:1 contrast, which makes it look like a typed value: another reason to avoid it.

**Seen in**

- [Dribbble](https://dribbble.com/shots/popular): Header search: "What are you looking for?" inside the field is the only visible label
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Header search: "Search Wikipedia" inside the field, next to a Search button
- [GOV.UK Design System](https://design-system.service.gov.uk/components/text-input/): Text input guidance: do not use placeholder text in place of a label

**Alternatives:** [Label above field](#label-top), [Floating label](#label-floating)

**Sources:** Katie Sherwin 2014, *Placeholders in Form Fields Are Harmful* (Placeholders in Form Fields Are Harmful); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Labels); Government Digital Service, *GOV.UK Design System* (Text input)

### Hint text

<a id="help-text"></a>

`help-text` · also called help text, helper text, input hint, supporting text

A short line of always-visible text next to a field that says what to enter or why it is asked.

**Use when**

- The format is not obvious: date order, units, reference numbers
- Users may wonder why the information is needed or where to find it

**Avoid when**

- The label alone is clear; unneeded hints add reading
- The help is long (link to it or use a disclosure)

**Rules**

- Place it between the label and the field so it is read before typing and stays visible on phones when the keyboard is open.
- Link it to the field with aria-describedby.
- Keep it to one sentence; give an example value rather than a description of the format.
- Do not hide it in a tooltip or in the placeholder.
- Keep it when an error appears; the error message is shown in addition.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/text-input/): Text input: hint text under the label
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines): Text input: helper text
- [Atlassian Design System](https://atlassian.design/components/textfield/usage): Text field: helper text below the label

**Alternatives:** [Tooltip](#tooltip), [Disclosure](#disclosure)

**Sources:** Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Help Text); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Input Hints); Adam Silver 2019, *The problem with tooltips and what to do instead* (The problem with tooltips and what to do instead)

### Mark required fields

<a id="mark-required"></a>

`mark-required` · also called required indicator, asterisk

Every field that must be filled in carries a mark, usually an asterisk, next to its label.

**Use when**

- The form mixes required and optional fields
- The audience expects the asterisk convention, as in most commercial web forms

**Avoid when**

- Every field is required and the form is short (say so once, or mark nothing)
- House style follows GOV.UK, which marks only optional fields and never uses asterisks

**Rules**

- Put the asterisk next to the label and explain it once at the top: "* required".
- Set the required attribute or aria-required="true" on the field; the asterisk alone is not announced reliably.
- Do not rely on red alone; the asterisk is the signal.
- Baymard advises marking optional fields as well, so that no field is left ambiguous.
- Ask only for what is needed; removing an optional field beats marking it.

**Seen in**

- [Atlassian Design System](https://atlassian.design/components/form/usage): Form: a red asterisk after the label of each required field, with a legend
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms): Forms pattern: when to label fields as required and when as optional
- Amazon: Checkout address form: optional fields are labelled, the rest are required (not re-checked)

**Alternatives:** [Mark optional fields](#mark-optional)

**Sources:** Raluca Budiu 2019, *Marking Required Fields in Forms* (Marking Required Fields in Forms); Edward Scott 2018, *E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly (Only 14% Do So)* (E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Labels)

### Mark optional fields

<a id="mark-optional"></a>

`mark-optional` · also called optional indicator

Fields are required unless their label ends with "(optional)".

**Use when**

- Nearly every field is required
- The form asks one thing per page, so a legend explaining an asterisk would repeat on every page
- The service follows GOV.UK style

**Avoid when**

- Many fields are optional (first ask whether they are needed at all)
- Users expect asterisks and would read unmarked fields as optional; NN/g found marking only optional fields makes forms harder to fill

**Rules**

- Add "(optional)" in plain text at the end of the label or legend.
- Do not set required on optional fields, and do not mark required fields at all.
- Validate required fields on submit with a message that names the field.
- Keep optional fields to a minimum.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/question-pages/): Question pages: add "(optional)" to labels and never mark mandatory fields with asterisks
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms): Forms pattern: when to label fields as optional rather than required

**Alternatives:** [Mark required fields](#mark-required)

**Sources:** Government Digital Service, *GOV.UK Design System* (Question pages); Raluca Budiu 2019, *Marking Required Fields in Forms* (Marking Required Fields in Forms); Edward Scott 2018, *E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly (Only 14% Do So)* (E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly)

## Actions

<a id="action"></a>

### Button hierarchy

<a id="button"></a>

`button` · also called primary, secondary and tertiary buttons, call to action, emphasis levels

Buttons in two or three levels of visual weight, so that the most likely action on a screen stands out and the others stay available.

**Use when**

- A screen offers more than one action
- One action is what most people came to do

**Avoid when**

- Every action is equally likely (give them equal weight)
- The "action" goes to another page (use a link)

**Rules**

- Use one primary button per screen or per dialog: solid fill, strongest contrast.
- Style secondary actions with an outline or a muted fill and tertiary actions as plain text; do not set hierarchy by color alone.
- Label buttons with a verb and its object ("Save changes", "Send invoice"), not "OK" or "Submit".
- In a form, put the primary button first after the fields, aligned with the left edge of the fields, with secondary actions beside it.
- In dialogs follow the platform order for confirm and cancel and keep it the same throughout the product.
- Make targets at least 44×44 px on touch screens (24×24 CSS px is the WCAG 2.2 AA minimum) and give every button visible hover, focus, pressed and disabled states.

**Seen in**

- [Apple](https://www.apple.com/): Product sections: a filled "Learn more" button next to an outlined "Buy" button
- [Material Design 3](https://m3.material.io/components/buttons/guidelines): Buttons: filled buttons for the most important actions, tonal, outlined and text for the rest
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/buttons): Buttons: a prominent style for the most likely action in a view
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines): Button: primary, secondary, tertiary and ghost

**Alternatives:** [Text link](#text-link), [Button group](#button-group), [Split button](#split-button), [Floating action button](#floating-action-button)

**Sources:** Adam Wathan 2018, *Refactoring UI* (Hierarchy is Everything); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Actions); Jakob Nielsen 2008, *OK-Cancel or Cancel-OK? The Trouble With Buttons* (OK-Cancel or Cancel-OK? The Trouble With Buttons)

### Destructive button

<a id="destructive-button"></a>

`destructive-button` · also called danger button, warning button

A button for an action that deletes or cannot easily be reversed, styled to look different from ordinary actions.

**Use when**

- The action removes data, cancels something paid for or affects other people
- The action sits near ordinary actions and must not be hit by mistake

**Avoid when**

- The action is easily undone (offer undo and use a normal button)
- Everything on the screen is marked as dangerous; the signal stops working

**Rules**

- Name the consequence in the label: "Delete project", not "Remove" or "OK".
- Use the danger color together with the wording; add an icon if color is the only other cue.
- Keep it away from the primary action: at the end of the page, in an overflow menu or in its own "Danger zone" section.
- Follow it with a confirmation step in proportion to the damage, or with an undo.
- In the confirmation dialog the destructive action may be the primary button, and Cancel must be the safe default for Enter and Escape.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/button/): Button: warning buttons for actions with serious, destructive consequences
- [GitLab Pajamas](https://design.gitlab.com/patterns/destructive-actions/): Destructive actions: friction to match the severity
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines): Button: the danger variant
- [GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository): Repository settings: "Delete this repository" in a separate danger area

**Alternatives:** [Confirmation dialog](#confirmation-dialog), [Typed confirmation](#typed-confirmation), [Undo instead of confirm](#undo)

**Sources:** Don Norman 2013, *The Design of Everyday Things* (Human Error? No, Bad Design); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Preventing Errors and Informing Decisions); GitLab, *Pajamas Design System* (Destructive actions)

### Button group

<a id="button-group"></a>

`button-group` · also called toolbar group, action group

Related buttons placed next to each other as one visual unit.

**Use when**

- Two to five actions act on the same thing and are used together
- A toolbar needs clusters so that it can be scanned

**Avoid when**

- The buttons are unrelated
- There are more actions than fit (move the rest into an overflow menu)
- Only one of them can be active (that is a segmented control)

**Rules**

- Group by what the actions affect and separate groups with space or a divider.
- Keep one consistent order across the product, with at most one primary button in a group.
- Give the buttons equal height and consistent gaps; join them only when they are variations of one command.
- Wrap them in an element with role="group", or role="toolbar" with arrow-key navigation for long sets, and a label.
- On narrow screens stack full-width or collapse the lowest-priority buttons into a "More" menu.

**Seen in**

- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/actions/button-group): Button group
- [Material Design 3](https://m3.material.io/components/button-groups/guidelines): Button groups: standard and connected
- [U.S. Web Design System](https://designsystem.digital.gov/components/button-group/): Button group: default and segmented
- [GitHub Primer](https://primer.style/product/components/action-bar/): ActionBar: icon buttons in a row with an overflow menu when space runs out

**Alternatives:** [Overflow menu](#overflow-menu), [Split button](#split-button), [Segmented control](#segmented-control)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Button Groups); Jeff Johnson 2020, *Designing with the Mind in Mind: Simple Guide to Understanding User Interface Design Guidelines* (Our Vision is Optimized to See Structure); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Toolbar pattern)

### Split button

<a id="split-button"></a>

`split-button` · also called combo button, button with menu

A button with a main action on one part and a small arrow part that opens a menu of related alternatives.

**Use when**

- One action is used most of the time and has a few variants: "Send" and "Schedule send"
- There is no room for a row of buttons

**Avoid when**

- The menu items are unrelated to the main action
- No single variant is the common one (use a menu button)
- The menu would hold navigation links

**Rules**

- Make the two parts visibly separate with a divider and give each its own focus stop and accessible name.
- Keep the main part's action fixed, or make clear that it repeats the last chosen variant.
- Make the arrow part at least 24 px wide and 44 px on touch screens.
- The menu follows the menu-button pattern: opens on click, arrow keys move, Escape closes and returns focus.
- Keep the menu short and limited to variants of the main action.

**Seen in**

- [Material Design 3](https://m3.material.io/components/split-button/guidelines): Split buttons
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/buttons): Buttons: split button with a primary action and a flyout
- [Atlassian Design System](https://atlassian.design/components/button/split-button/usage): Split button
- Gmail: Compose window: "Send" with an arrow for "Schedule send" (not re-checked)

**Alternatives:** [Button group](#button-group), [Overflow menu](#overflow-menu), [Dropdown menu](#dropdown-menu)

**Sources:** Page Laubheimer 2019, *Split Buttons: Definition* (Split Buttons: Definition); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs)

### Icon button

<a id="icon-button"></a>

`icon-button` · also called icon-only button

A button that shows only an icon, with its name available to assistive technology and on hover.

**Use when**

- Space is tight, as in toolbars and table rows
- The icon is one almost everyone knows: search, close, menu, print, settings
- The same action repeats on many rows

**Avoid when**

- The icon needs explaining; NN/g found few icons are understood without a label
- It is the main action of the screen (give it a text label)

**Rules**

- Give it an accessible name with aria-label and show the same words in a tooltip on hover and on keyboard focus.
- Keep the visual icon around 20–24 px inside a target of at least 44×44 px on touch screens.
- Use one icon for one meaning across the product.
- Show hover, focus and pressed states; an icon alone does not look clickable.
- Prefer icon plus text wherever there is room, especially in navigation.

**Seen in**

- [Material Design 3](https://m3.material.io/components/icon-buttons/guidelines): Icon buttons: for common actions, with default and toggle variants
- [GitHub Primer](https://primer.style/product/components/icon-button/): IconButton: an icon-only button with a required label
- [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/hello-world): Header: an icon-only button that collapses the sidebar

**Alternatives:** [Button hierarchy](#button), [Overflow menu](#overflow-menu), [Toggle button](#toggle-button)

**Sources:** Aurora Harley 2014, *Icon Usability* (Icon Usability); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Target Size (Minimum)); Google, *Material Design 3* (Icon buttons)

### Floating action button

<a id="floating-action-button"></a>

`floating-action-button` · also called FAB

A round or pill-shaped button that floats above the content, usually at the bottom right, for the one main action of a screen.

**Use when**

- A screen has one main constructive action such as create, compose or add
- The content scrolls and the action must stay in reach
- The screen is a phone or tablet

**Avoid when**

- The action is minor or destructive
- A screen would need several
- It would cover content or controls at the bottom of the screen

**Rules**

- Use at most one per screen and only for a positive action.
- Place it at the bottom trailing corner, above any bottom navigation, with a 16 px margin.
- Use a familiar icon; add a text label (extended FAB) when the icon is not self-evident.
- Leave room at the end of scrolling content so the last item can be moved clear of it.
- Give it an accessible name and put it in a sensible place in the focus order, not last on the page.

**Seen in**

- [Material Design 3](https://m3.material.io/components/floating-action-button/guidelines): FAB: for the most important action on a screen
- Gmail for Android: Inbox: a "Compose" button floating at the bottom right (not re-checked)
- Google Maps: Map view: a floating button for directions (not re-checked)

**Alternatives:** [Bottom action bar](#bottom-action-bar), [Button hierarchy](#button)

**Sources:** Google, *Material Design 3* (Floating action buttons); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Fitts's Law)

### Text link

<a id="text-link"></a>

`text-link` · also called hyperlink, link styled as text

Underlined or colored text that takes the user to another page or place.

**Use when**

- Activating it navigates: to another page, a section or a file
- The destination should be openable in a new tab, copied or bookmarked

**Avoid when**

- Activating it changes data or state (use a button)
- It is the main call to action of the page and needs weight (use a link styled as a button)

**Rules**

- Use an a element with href for navigation and a button element for actions, whatever they look like.
- Underline links inside running text; color alone is not enough.
- Write link text that makes sense out of context; never "click here".
- Say so in the link text when it opens a new tab or downloads a file ("Annual report (PDF, 2 MB)").
- Keep a visible focus outline and a distinct visited color where history matters.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/link/): Link pattern
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/link/guidelines): Link: standalone and inline
- [U.S. Web Design System](https://designsystem.digital.gov/components/link/): Link
- [Apple](https://www.apple.com/iphone/compare/): Under the page title: "Shop iPhone" and "Chat with a Specialist" as text links with a chevron

**Alternatives:** [Button hierarchy](#button), [Icon button](#icon-button)

**Sources:** Steve Krug 2014, *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (Billboard Design 101); Jakob Nielsen 2007, *Command Links* (Command Links); Hoa Loranger 2015, *Beyond Blue Links: Making Clickable Elements Recognizable* (Beyond Blue Links: Making Clickable Elements Recognizable)

### Overflow menu

<a id="overflow-menu"></a>

`overflow-menu` · also called more menu, kebab menu, meatball menu, ellipsis menu, actions menu

A button marked with three dots, or "More", that opens a short menu of the less used actions.

**Use when**

- An item or toolbar has more actions than fit
- Some actions are used rarely
- The same set of actions repeats on every row or card

**Avoid when**

- It would hide the main action
- There are only one or two actions and room to show them
- The menu would mix navigation, settings and commands with no relation to the item

**Rules**

- Keep the one or two most used actions visible and put only the rest in the menu.
- Label the trigger for assistive technology with what it acts on ("More actions for Invoice 1042").
- Use the menu-button pattern: aria-haspopup, aria-expanded, arrow keys, Escape returns focus to the trigger.
- Order items by use, separate destructive ones with a divider at the end, and write items as verbs.
- Use the same trigger icon in the same position on every row.

**Seen in**

- [GitHub Primer](https://primer.style/product/components/action-menu/): ActionMenu
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons): Pull-down buttons: a menu of items related to the button
- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Article toolbar: a three-dot button for further tools
- [Atlassian Design System](https://atlassian.design/components/dropdown-menu/usage): Dropdown menu

**Alternatives:** [Button group](#button-group), [Row actions on hover](#hover-row-actions), [Split button](#split-button), [Dropdown menu](#dropdown-menu)

**Sources:** Anna Kaley 2019, *Contextual Menus: Delivering Relevant Tools for Tasks* (Contextual Menus: Delivering Relevant Tools for Tasks); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Contextual Tools); Heydon Pickering 2019, *Inclusive Components* (Menus & Menu Buttons)

### Bulk action bar

<a id="bulk-action-bar"></a>

`bulk-action-bar` · also called batch actions, selection toolbar, multi-select actions

A bar that appears when rows are selected, showing how many are selected and the actions that apply to all of them.

**Use when**

- People often do the same thing to many items: delete, move, label, export
- The list has checkboxes for selection

**Avoid when**

- Actions apply to one item at a time
- The list is short and rarely edited

**Rules**

- Put a checkbox on each row and a tri-state "select all" in the header.
- Show the bar only while something is selected, with the count ("3 selected") and a way to clear the selection.
- Place the bar where the table toolbar is, or fix it to the bottom of the window, so it is visible wherever the user has scrolled.
- When "select all" covers only the visible page, offer "Select all 312 items".
- Confirm or offer undo for destructive bulk actions and report partial failures per item.
- Announce the selection count to screen readers when it changes.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): Data table: batch actions on selected rows
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table): Index table: checkboxes for bulk selection and bulk actions
- [Gmail](https://support.google.com/mail/answer/7401?hl=en): Inbox: select all messages on the page, then act on the selection

**Alternatives:** [Row actions on hover](#hover-row-actions), [Overflow menu](#overflow-menu)

**Sources:** Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Direct Selection); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Action Panel); IBM, *Carbon Design System* (Data table)

### Row actions on hover

<a id="hover-row-actions"></a>

`hover-row-actions` · also called hover-reveal tools, hover tools, quick actions

Action buttons that appear on a list row or card when the pointer is over it or it has keyboard focus.

**Use when**

- Lists are long and showing actions on every row would be noise
- Users are frequent and use a mouse
- The actions are quick, such as archive, edit or copy link

**Avoid when**

- The product is used on touch screens, where there is no hover
- The actions are the only way to do something important
- New users must discover the actions without help

**Rules**

- Show the same actions on keyboard focus within the row, not on hover only.
- On touch screens show them always, behind an overflow button, or through a swipe that also has a visible alternative.
- Reserve the space so the row content does not move when the actions appear.
- Limit to two or three icon buttons with tooltips; put the rest in an overflow menu.
- Never hide the only route to an action: also offer it on the item's detail view.

**Seen in**

- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table): Index table: row actions revealed on hover
- Gmail: Inbox rows: archive, delete and snooze appear at the end of the row under the pointer (not re-checked)
- Notion: Blocks: a drag handle and add button appear beside a block on hover (not re-checked)

**Alternatives:** [Overflow menu](#overflow-menu), [Bulk action bar](#bulk-action-bar)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Hover or Pop-Up Tools); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Contextual Tools); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Content on Hover or Focus)

### Drag and drop

<a id="drag-and-drop"></a>

`drag-and-drop` · also called drag to reorder, direct manipulation

Moving something by pressing on it, dragging it to a new place and letting go.

**Use when**

- Position is the point: reordering a list, moving cards between columns, arranging a layout
- Files are added from the desktop

**Avoid when**

- Lists are long and the target is off screen
- It would be the only way to do the task; WCAG 2.2 requires a way that needs no dragging

**Rules**

- Show a drag handle and change the cursor so the item looks movable.
- While dragging, show a preview of the item, mark where it will land, and scroll the container near its edges.
- Provide a non-drag way to do the same: "Move up" and "Move down" buttons or a "Move to…" menu.
- Support the keyboard: Space picks up, arrow keys move, Space drops, Escape cancels; announce each step.
- Make the result easy to undo.
- Use large drop targets and accept drops slightly outside them.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop): Drag and drop: offer alternative ways to accomplish drag-and-drop actions
- [GitHub](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files): Comment boxes: attach files by dragging them in, pasting or choosing
- [Google Drive](https://support.google.com/drive/answer/2424368?hl=en): Upload by dragging files into a folder
- Trello: Boards: cards dragged between lists (not re-checked)

**Alternatives:** [Overflow menu](#overflow-menu), [File upload](#file-upload)

**Sources:** Page Laubheimer 2020, *Drag–and–Drop: How to Design for Ease of Use* (Drag–and–Drop: How to Design for Ease of Use); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Drag and Drop); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Dragging Movements)

### Undo instead of confirm

<a id="undo"></a>

`undo` · also called undo toast, undo send, soft delete

The action happens at once, and a message offers to reverse it for a short time.

**Use when**

- The action is frequent and can be reversed or delayed: archive, delete to trash, send, move
- Asking for confirmation every time would be clicked through without reading

**Avoid when**

- The action truly cannot be reversed or delayed
- Other people or systems see the effect at once

**Rules**

- Do the action immediately and show a message that names it with an "Undo" button: "Conversation archived. Undo".
- Keep the message for long enough to read and reach; if it disappears on its own, also offer undo elsewhere (a Trash, a history, Ctrl/Cmd+Z).
- Implement by delaying the real effect or by soft-deleting, so that undo always works.
- Undo restores the item to its place, with selection and scroll position.
- Make the message a status region so it is announced, and make the Undo button reachable by keyboard without a race against the timer.

**Seen in**

- [Gmail](https://support.google.com/mail/answer/2819488?hl=en): After sending: "Message sent" with "Undo", for a period chosen in settings
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo): Undo and redo
- [Material Design 3](https://m3.material.io/components/snackbar/guidelines): Snackbar: a brief message that can carry one action

**Alternatives:** [Confirmation dialog](#confirmation-dialog), [Typed confirmation](#typed-confirmation), [Destructive button](#destructive-button)

**Sources:** Aza Raskin 2007, *Never Use a Warning When you Mean Undo* (Never Use a Warning When you Mean Undo); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Preventing Errors and Informing Decisions); Maria Rosala 2020, *User Control and Freedom (Usability Heuristic #3)* (User Control and Freedom (Usability Heuristic #3))

### Save button

<a id="explicit-save"></a>

`explicit-save` · also called explicit save, submit button, save changes

Changes on a page take effect only when the user presses a Save button at the end of the form.

**Use when**

- Several fields change together and should be validated together
- A change has consequences and the user should decide when it applies
- The page is a classic form

**Avoid when**

- Each control is an independent setting that could apply at once (use switches with autosave)
- The page is long and the button would be far from the change (use a sticky save bar)

**Rules**

- Put one "Save changes" button after the last field; add "Cancel" or "Discard" only if it is clear what it does.
- Keep the button enabled and validate on press, rather than disabling it until the form is valid.
- After saving, confirm with an inline message or a toast and keep the user where they were.
- Warn before the user leaves with unsaved changes.
- Do not mix this with instantly applied controls in the same form.
- While saving, show progress on the button and prevent a second submission.

**Seen in**

- [GitHub Primer](https://primer.style/product/ui-patterns/saving/): Saving pattern: start with explicit saving and do not mix save patterns in one form
- [GitLab Pajamas](https://design.gitlab.com/patterns/saving-and-feedback/): Saving and feedback
- [GOV.UK Design System](https://design-system.service.gov.uk/components/button/): Button: default, secondary and warning buttons for form actions

**Alternatives:** [Sticky save bar](#sticky-save-bar), [Autosave](#autosave)

**Sources:** GitHub, *Primer Design System* (Saving); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Actions); Adam Silver 2023, *The problem with disabled buttons and what to do instead* (The problem with disabled buttons and what to do instead)

### Sticky save bar

<a id="sticky-save-bar"></a>

`sticky-save-bar` · also called contextual save bar, unsaved changes bar

A bar that appears as soon as something on the page is changed, stays in view, and offers Save and Discard.

**Use when**

- The page is long and the changed field may be far from the end of the form
- Users must be told clearly that there are unsaved changes
- Several sections on the page are saved together

**Avoid when**

- Changes apply instantly
- The form is short and its Save button is always visible

**Rules**

- Show the bar only when the form differs from its saved state, and remove it after save or discard.
- Say "Unsaved changes" and offer two buttons: "Save" (primary) and "Discard".
- Fix it to the top or bottom edge of the window and make sure it never covers the focused field.
- Discard restores every field to the saved value; ask for confirmation if much would be lost.
- Block navigation away while changes are unsaved, or ask first.
- On save, validate; on error, keep the bar and move focus to the first problem.

**Seen in**

- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/app-bridge-web-components/save-bar): Save bar: appears when form data changes, prompting to save or discard
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/save-bar-api): Save Bar API
- Discord: Settings: a bar warning of unsaved changes, with Reset and Save (not re-checked)

**Alternatives:** [Save button](#explicit-save), [Autosave](#autosave), [Bottom action bar](#bottom-action-bar)

**Sources:** Shopify, *Polaris* (Save bar); GitHub, *Primer Design System* (Saving); Jakob Nielsen 1994, *10 Usability Heuristics for User Interface Design* (Visibility of system status)

### Autosave

<a id="autosave"></a>

`autosave` · also called automatic save, instant apply, save on change

Every change is stored as it is made, with no Save button.

**Use when**

- The page is a document or a set of independent settings
- Losing work would be costly and saving is cheap
- Each change is valid on its own

**Avoid when**

- Fields depend on each other and half-saved states are invalid
- A change has effects the user should confirm, such as sending, publishing or charging
- Users expect to review before committing, as in a checkout

**Rules**

- Save on change for switches and selections, and on blur or after a short pause in typing for text.
- Show the state near the content: "Saving…", then "Saved" with a time; never leave the user guessing.
- On failure say so, keep the user's input, and retry or offer "Try again".
- Provide undo or a version history, since there is no Cancel.
- Do not show a Save button that does nothing; do not mix autosave and explicit save in one form.
- Handle offline: queue changes and say that they are not yet saved.

**Seen in**

- [GitHub Primer](https://primer.style/product/ui-patterns/saving/): Saving pattern: explicit and automatic saving, and when each applies
- [Visual Studio Code](https://code.visualstudio.com/docs/editing/codebasics): Editor: an Auto Save setting that saves after a delay or on focus change
- [Google Docs](https://support.google.com/docs/answer/190843?hl=en): Version history: browse and restore earlier versions of a file

**Alternatives:** [Save button](#explicit-save), [Sticky save bar](#sticky-save-bar)

**Sources:** Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Rethinking Data Entry, Storage, and Retrieval); GitHub, *Primer Design System* (Saving); Alita Kendrick 2018, *Toggle-Switch Guidelines* (Toggle-Switch Guidelines)

## Content

<a id="content"></a>

### Card

<a id="card"></a>

`card` · also called tile, content card

A bordered or raised box that groups an image, a title, a few facts and actions about one item.

**Use when**

- Items are browsed rather than searched and each has a picture or mixed content
- Each item links to a detail page and may have one or two actions
- Items are shown in a grid or a horizontal row

**Avoid when**

- Items are compared by attribute or sorted by column (use a table)
- Items are text only and many (use list rows)
- The box only decorates a section of a page that is not an item

**Rules**

- Put the image first, then the title, then supporting text, then actions; keep that order in every card.
- Make the title the link (or stretch its click area over the card) and keep the heading as the first thing read by screen readers.
- If the whole card is clickable, do not put other links inside it except clearly separate buttons.
- Clamp text so cards in a row stay the same height.
- Separate cards with space plus a border or shadow; do not use a shadow so strong that every card looks pressed.
- Use the same card for the same kind of item everywhere in the product.

**Seen in**

- [Dribbble](https://dribbble.com/shots/popular): Shot listing: an image with the author and counts beneath it
- [Material Design 3](https://m3.material.io/components/cards/guidelines): Cards: elevated, filled and outlined
- [U.S. Web Design System](https://designsystem.digital.gov/components/card/): Card: header, media, body and footer, with flag and media-first variants
- [GitHub](https://github.com/): Home page: product cards with a screenshot, title, one line of text and two buttons

**Alternatives:** [List row](#list-row), [Data table](#data-table), [Thumbnail grid](#thumbnail-grid)

**Sources:** Page Laubheimer 2016, *Cards: UI-Component Definition* (Cards: UI-Component Definition); Heydon Pickering 2019, *Inclusive Components* (Cards); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Cards)

### List row

<a id="list-row"></a>

`list-row` · also called list item, row, cell

One line or short block per item in a vertical list: a title, a little supporting text and perhaps an icon or an action.

**Use when**

- Items are identified by their text
- There are many items and people scan down them
- The list must work in a narrow column or on a phone

**Avoid when**

- Items are chosen by image (use cards or thumbnails)
- Several attributes must line up for comparison (use a table)

**Rules**

- Put the identifying text first and make it the strongest; put secondary facts under or after it in a lighter style.
- Keep one to three lines per row and align rows on the same left edge.
- Make the whole row the click target when a row leads to a detail view, with a chevron at the end where that is the platform convention.
- Keep at least 44 px row height on touch screens.
- Separate rows with space or a hairline, not both heavy borders and backgrounds.
- Mark up as ul or ol with li, or as a table when rows have columns.

**Seen in**

- [Hacker News](https://news.ycombinator.com/): Front page: numbered rows with a title line and a smaller line of metadata
- [GOV.UK](https://www.gov.uk/): Home page: topic rows with a linked title, a description and a chevron
- [Material Design 3](https://m3.material.io/components/lists/guidelines): Lists: items with label text and optional supporting text
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables): Lists and tables

**Alternatives:** [Card](#card), [Data table](#data-table)

**Sources:** Kim Flaherty 2016, *The Anatomy of a List Entry* (The Anatomy of a List Entry); Steven Hoober 2011, *Designing Mobile Interfaces* (Vertical List); Google, *Material Design 3* (Lists)

### Data table

<a id="data-table"></a>

`data-table` · also called table, data grid, index table

Rows of records and columns of attributes, so that values can be read across and compared down.

**Use when**

- Each item has several attributes that people compare, sort or scan
- People look up one record among many
- The data is numeric or status-like

**Avoid when**

- Items have one or two attributes (use a list)
- The screen is narrow and columns cannot be reduced
- Content is mainly images or long text

**Rules**

- Left-align text, right-align numbers, and give numbers a consistent precision and tabular figures.
- Put the identifying column first and keep it and the header visible while scrolling.
- Make sortable headers buttons, show the sort direction with an arrow and set aria-sort.
- Use real table markup with th and scope; add a caption that names the table.
- Keep rows at least 40 px tall; separate them with light lines or zebra shading, not both.
- On small screens hide lower-priority columns, allow horizontal scroll with the first column fixed, or turn each row into a card.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): Data table: sorting, expansion, selection and batch actions
- [GOV.UK Design System](https://design-system.service.gov.uk/components/table/): Table: captions, numeric columns, column widths
- [Wikipedia](https://en.wikipedia.org/wiki/List_of_countries_and_dependencies_by_population): List of countries by population: a sortable table
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table): Index table: a scannable list with search, filtering, sorting and bulk actions

**Alternatives:** [List row](#list-row), [Card](#card), [Comparison table](#comparison-table)

**Sources:** Page Laubheimer 2022, *Data Tables: Four Major User Tasks* (Data Tables: Four Major User Tasks); Heydon Pickering 2019, *Inclusive Components* (Data Tables); Adam Wathan 2018, *Refactoring UI* (Finishing Touches)

### Description list

<a id="description-list"></a>

`description-list` · also called key–value list, summary list, details list, property list

A list of label and value pairs that describes one thing, such as the details of an order or a profile.

**Use when**

- One record has several named facts to show
- The page is a summary or review of what was entered

**Avoid when**

- Several records must be compared (use a table)
- The values are long prose

**Rules**

- Mark up as dl with dt and dd.
- Put labels in one column and values in the next on wide screens; stack label over value on narrow ones.
- Style the label lighter or smaller than the value; the value is what people read.
- Show "Not provided" rather than an empty value.
- Put row actions such as "Change" at the end of the row, with hidden text that names the row ("Change date of birth").

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/summary-list/): Summary list: key, value and action per row
- [Wikipedia](https://en.wikipedia.org/wiki/Tim_Berners-Lee): Biography article: an infobox of labelled facts beside the text
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/structured-list/guidelines): Structured list

**Alternatives:** [Data table](#data-table), [Card](#card)

**Sources:** Government Digital Service, *GOV.UK Design System* (Summary list); Adam Wathan 2018, *Refactoring UI* (Hierarchy is Everything); Government Digital Service, *GOV.UK Design System* (Check answers)

### Disclosure

<a id="disclosure"></a>

`disclosure` · also called details, expander, show more, collapsible, read more

A short label that the user can open to reveal more content in place, and close again.

**Use when**

- Extra information helps some users and would slow down the rest
- A long text or list can be cut after the part most people need
- Advanced options should stay out of the way

**Avoid when**

- Everyone needs the content (show it)
- The hidden content is an error or a warning
- Several are stacked as page sections (that is an accordion)

**Rules**

- Use the native details and summary elements, or a button with aria-expanded that controls the region.
- Write the label so it says what is inside: "Help with nationality", "Show 12 more".
- Reveal the content directly under the label and push the rest down; do not open an overlay.
- Change the label or icon when open ("Show less"), and keep the control in the same place.
- Do not hide content that is needed to complete the task or that search engines and find-in-page should reach by default.
- When truncating text, cut at a sentence or line boundary and show enough to judge whether to open it.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/details/): Details: make a page easier to scan by hiding information only some users need
- [GOV.UK](https://www.gov.uk/search/all?keywords=passport): Search results: a "Filter and sort" control that expands above the list
- [Airbnb](https://www.airbnb.com/): Home page: "Show more" at the end of a list of destinations
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): Disclosure (show/hide) pattern

**Alternatives:** [Accordion sections](#accordion-sections), [Tooltip](#tooltip), [Popover](#popover), [Modal dialog](#modal-dialog)

**Sources:** Jakob Nielsen 2006, *Progressive Disclosure* (Progressive Disclosure); Heydon Pickering 2019, *Inclusive Components* (Collapsible Sections); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Disclosure pattern)

### Carousel

<a id="carousel"></a>

`carousel` · also called slider, slideshow, content slider, horizontal scroller

A row of items of which only some fit on screen; the rest are reached by buttons or by swiping sideways.

**Use when**

- A set of similar items should take one row of height: related products, photos of one thing
- People may browse it but nothing depends on their seeing every item

**Avoid when**

- It would hold the page's key messages; NN/g observed users ignoring a large auto-forwarding carousel as if it were an advertisement
- It moves by itself and carries text that must be read
- There are only two or three items (show them)

**Rules**

- Do not auto-advance; if you must, pause on hover and focus, provide a visible pause button, and stop after one cycle.
- Show part of the next item at the edge so it is clear there is more.
- Provide Previous and Next buttons with names, large enough to hit, and position dots or "3 of 7".
- Let touch users swipe (CSS scroll-snap) and keyboard users reach every item in order.
- Mark up as a region labelled as a carousel; each slide is a group labelled "n of m".
- Never put the only link to something inside a later slide.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): Carousel pattern: rotation control, previous and next, slide picker
- [Material Design 3](https://m3.material.io/components/carousel/guidelines): Carousel: a row of items that scrolls sideways
- [Apple](https://www.apple.com/): Home page: a moving media strip with a pause button at its corner
- [The Guardian](https://www.theguardian.com/international): Front page: a row of story cards with a next arrow at the end

**Alternatives:** [Card grid](#card-grid), [Thumbnail grid](#thumbnail-grid), [Featured item with grid](#featured-grid)

**Sources:** Kara Pernice 2013, *Carousel Usability: Effective UI for Content Overload* (Carousel Usability: Effective UI for Content Overload); Jakob Nielsen 2013, *Auto-Forwarding Carousels, Accordions Annoy Users & Reduce Visibility* (Auto-Forwarding Carousels, Accordions Annoy Users & Reduce Visibility); Edward Scott 2019, *10 UX Requirements for Homepage Carousels* (10 UX Requirements for Homepage Carousels)

### Thumbnail grid

<a id="thumbnail-grid"></a>

`thumbnail-grid` · also called image grid, gallery grid, photo grid

Small images in rows and columns, each standing for an item that opens larger or in detail.

**Use when**

- Items are recognized by how they look: photos, designs, products, videos
- People scan many items quickly

**Avoid when**

- Items look alike and need text to tell apart (use cards or a list)
- Images need their captions to be understood

**Rules**

- Give every thumbnail the same aspect ratio, cropped with object-fit: cover, and a small consistent gap.
- Provide alt text that identifies each item, or a visible caption.
- Make each thumbnail a link or button with a focus outline; show extra information on hover and on focus.
- Load images lazily and reserve their space.
- Let the column count follow the width; keep thumbnails large enough to recognize, about 120 px or more.

**Seen in**

- [Dribbble](https://dribbble.com/shots/popular): Shot listing: a grid of equal-ratio images
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/collections): Collections: image-based content in a grid
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/media-and-visuals/thumbnail): Thumbnail: a small preview image for an item

**Alternatives:** [Card grid](#card-grid), [Masonry grid](#masonry-grid), [Carousel](#carousel), [List row](#list-row)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Thumbnail Grid); Alan Blackwood 2020, *Product Image UX: Always Use Thumbnails* (Product Image UX: Always Use Thumbnails); Steven Hoober 2011, *Designing Mobile Interfaces* (Grid)

### Avatar

<a id="avatar"></a>

`avatar` · also called profile picture, user image, persona

A small round or square image, or initials, that stands for a person or an organization.

**Use when**

- Content is attributed to people: comments, assignments, messages
- People are recognized faster by face than by name

**Avoid when**

- The picture adds nothing because every item is from the same person
- It would be the only way to tell who someone is

**Rules**

- Use fixed sizes from a small scale (for example 24, 32, 40, 64 px) and one shape for people.
- Fall back to initials on a colored background, then to a generic icon; the initials color must pass contrast.
- Show the name next to the avatar, or as a tooltip and accessible name when space is short.
- For groups overlap a few avatars and end with "+3".
- Give decorative avatars empty alt text when the name is printed beside them.

**Seen in**

- [GitHub Primer](https://primer.style/product/components/avatar/): Avatar
- [Atlassian Design System](https://atlassian.design/components/avatar/usage): Avatar: images, initials and presence
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/persona/usage): Persona: an avatar with name and status
- [Mastodon](https://mastodon.social/explore): Posts: the author's avatar beside their name and handle

**Alternatives:** [List row](#list-row), [Tag](#tag)

**Sources:** Atlassian, *Atlassian Design System* (Avatar); Microsoft, *Fluent 2 Design System* (Persona)

### Status badge

<a id="status-badge"></a>

`status-badge` · also called status pill, lozenge, state label, status tag

A small colored label with one or two words that states the status of an item.

**Use when**

- Items have a state from a short fixed set: Draft, Active, Paid, Failed
- The state must be scanned down a list or table

**Avoid when**

- The label can be clicked or removed (that is a chip or a tag)
- The text is a count (use a badge counter)
- There are so many states that colors repeat

**Rules**

- Always include text; color only supports it.
- Use one color per meaning across the product: for example grey neutral, blue in progress, green success, yellow attention, red problem.
- Keep the label to one or two words in sentence case and do not truncate it.
- Give it the same height as the text line it sits in and do not make it look like a button.
- Put it in the same place in every row, usually a status column or next to the title.

**Seen in**

- [Atlassian Design System](https://atlassian.design/components/lozenge/usage): Lozenge: a visual indicator of status
- [GOV.UK Design System](https://design-system.service.gov.uk/components/tag/): Tag: shows the status of something
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/badge): Badge: status and progress of an object
- [GitHub Primer](https://primer.style/product/components/state-label/): StateLabel: the state of an issue or pull request

**Alternatives:** [Tag](#tag), [Badge counter](#badge-counter)

**Sources:** IBM, *Carbon Design System* (Status indicators); Government Digital Service, *GOV.UK Design System* (Tag); Jeff Johnson 2020, *Designing with the Mind in Mind: Simple Guide to Understanding User Interface Design Guidelines* (Our Color Vision is Limited)

### Tag

<a id="tag"></a>

`tag` · also called chip, label, token, pill

A small rounded label that marks an item with a category or keyword, and may be clicked to filter or removed.

**Use when**

- Items carry free-form or user-defined categories
- A filter that is switched on needs to be shown and removable
- Several values chosen in a field need to be visible

**Avoid when**

- The label states a system status (use a status badge)
- There are so many per item that they wrap over several lines

**Rules**

- Keep tag text short; cap the width and show the full text in a tooltip when cut.
- If a tag filters, make it a link or button and show the selected state; if it can be removed, add an × button with a name such as "Remove bug".
- Limit visible tags per item and collapse the rest into "+4".
- Do not rely on tag color for meaning; when users pick colors, compute readable text color.
- Keep at least 24×24 px targets and 8 px between interactive tags.

**Seen in**

- [GitHub](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels): Issues and pull requests: colored labels that categorize and filter
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/tag/guidelines): Tag: read-only, dismissible, selectable and operational
- [Material Design 3](https://m3.material.io/components/chips/guidelines): Chips: assist, filter, input and suggestion
- [U.S. Web Design System](https://designsystem.digital.gov/components/tag/): Tag

**Alternatives:** [Status badge](#status-badge), [Tag input](#tag-input)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Tags); Google, *Material Design 3* (Chips); Kathryn Reeves 2020, *Filtering UX: Display “Applied Filters” in an Overview* (Filtering UX: Display "Applied Filters" in an Overview)

### Empty state

<a id="empty-state"></a>

`empty-state` · also called blank slate, zero state, no results

What is shown in place of a list, table or panel when it has nothing in it, with an explanation and a next step.

**Use when**

- A collection has no items yet
- A search or filter returns nothing
- A feature has not been set up

**Avoid when**

- The data is still loading (show a loading state)
- Loading failed (show an error with a retry)

**Rules**

- Say what would be here and why it is empty: first use, no results or nothing left to do.
- Offer one primary action that fills it ("Create project") or, for no results, ways out: clear filters, check spelling, broaden the search.
- Keep the surrounding frame (title, toolbar, column headers) so the page is recognizable.
- Use an illustration only if it is small and does not push the action below the fold.
- Do not show an empty table with only headers and no message.
- Write a different message for each cause; "No data" is not enough.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states): Empty states pattern
- [GitHub Primer](https://primer.style/product/components/blankslate/): Blankslate: a placeholder that explains why content is missing
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/empty-state): Empty state
- [Atlassian Design System](https://atlassian.design/components/empty-state/usage): Empty state

**Alternatives:** [Skeleton screen](#skeleton), [Banner](#banner), [Coach mark](#coach-mark)

**Sources:** Kate Kaplan 2021, *Designing Empty States in Complex Applications: 3 Guidelines* (Designing Empty States in Complex Applications: 3 Guidelines); Adam Wathan 2018, *Refactoring UI* (Finishing Touches); Sonia Sousa 2019, *5 Proven UX Strategies For "No Results" Pages* (5 Proven UX Strategies For "No Results" Pages)

### Stat tile

<a id="stat-tile"></a>

`stat-tile` · also called KPI tile, metric card, big number, scorecard

A small panel showing one number with its label and, usually, how it changed.

**Use when**

- A few key figures summarize the state of things
- People check the same figures on every visit

**Avoid when**

- The trend or distribution matters more than the latest value (use a chart)
- There are more than about six; they stop being key

**Rules**

- Make the value the largest text, the label small above or below it, and state the unit and the period.
- Show change against a comparison ("+12% vs last month") with an arrow or sign as well as color.
- Say whether up is good or bad through color only as a supplement to text.
- Align tiles in one row of equal width; wrap to two columns on phones.
- Abbreviate large numbers consistently (12.4k) and give the exact value on hover or focus.
- If the tile links to detail, make the whole tile one link.

**Seen in**

- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/metrics-card): Metrics card
- [GitHub](https://github.com/): Home page: "44M+ developers building on GitHub" as a single large figure with a label
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/data-visualization/dashboards): Dashboards: key figures and charts

**Alternatives:** [Data table](#data-table), [Dashboard](#dashboard-grid)

**Sources:** Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Dashboard); Page Laubheimer 2017, *Dashboards: Making Charts and Graphs Easier to Understand* (Dashboards: Making Charts and Graphs Easier to Understand); Adam Wathan 2018, *Refactoring UI* (Hierarchy is Everything)

### Timeline

<a id="timeline"></a>

`timeline` · also called activity log, history, process list

Events or steps placed along a vertical line in order, each with a marker, a title and a time.

**Use when**

- The order and timing of events is the point: history, activity, shipment tracking
- A process has stages to explain in sequence

**Avoid when**

- Events need filtering, sorting or comparing (use a table)
- The items are live posts to read and react to (use a feed)

**Rules**

- Run the line down the leading edge with a marker per event; put the newest first for logs and the first step first for processes.
- Give each entry a short title, a timestamp and optional detail; group entries by day when there are many.
- Distinguish kinds of events with icons, not only colors.
- Mark up as an ordered list; the line and markers are decoration.
- Mark the current stage in a process and expose it with aria-current="step".

**Seen in**

- [GitHub Primer](https://primer.style/product/components/timeline/): Timeline: a vertical list of events
- [U.S. Web Design System](https://designsystem.digital.gov/components/process-list/): Process list: the steps of a process in order
- [GOV.UK](https://www.gov.uk/learn-to-drive-a-car): Step-by-step page: numbered steps joined by a vertical line
- [GitHub](https://github.blog/changelog/): Changelog: product updates listed by date

**Alternatives:** [Feed](#feed), [Data table](#data-table), [Step indicator](#step-indicator)

**Sources:** GitHub, *Primer Design System* (Timeline); U.S. General Services Administration, *U.S. Web Design System (USWDS)* (Process list)

### Pricing table

<a id="pricing-table"></a>

`pricing-table` · also called plan cards, pricing tiers

Plans shown side by side as columns, each with its name, price, main features and a button to choose it.

**Use when**

- A product is sold in two to four plans
- People choose mostly by price and a few headline differences

**Avoid when**

- There is one plan (state the price)
- Plans differ in many small details (add a comparison table below)
- Prices are quoted individually

**Rules**

- Show plans as equal-width columns in order of price; stack them on phones with the recommended plan first or clearly marked.
- Give each plan a name, who it is for, the price with its unit ("per user / month"), a button and five to eight key features.
- Mark at most one plan as recommended, with a label as well as a border or color.
- If billing period changes the price, put a monthly/yearly segmented control above the plans and update all prices together.
- Word feature lists so they can be compared across plans: same order, "Everything in Pro, plus…".
- Link to a full comparison table for the details.

**Seen in**

- [GitHub](https://github.com/pricing): Pricing page: Free, Team and Enterprise columns with "Recommended" on one
- [Slack](https://slack.com/pricing): Pricing page: four plans with "Best value" on one and a feature table below
- [Stripe](https://docs.stripe.com/payments/checkout/pricing-table): Embeddable pricing table for subscriptions

**Alternatives:** [Comparison table](#comparison-table), [Card grid](#card-grid)

**Sources:** Kate Moran 2024, *Comparison Tables for Products, Services, and Features* (Comparison Tables for Products, Services, and Features); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Von Restorff Effect); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Hick's Law)

### Testimonial

<a id="testimonial"></a>

`testimonial` · also called customer quote, social proof, logo wall

A short statement from a named customer, or a row of customer logos, shown to support a claim.

**Use when**

- Visitors do not know the product and trust is a barrier
- Real, attributable customers have agreed to be quoted

**Avoid when**

- The quote is anonymous or invented; unattributed praise reads as advertising
- It would interrupt a task such as checkout

**Rules**

- Attribute every quote: full name, role and company, with a photo or logo.
- Keep the quote to one to three sentences about a concrete result.
- Place it next to the claim it supports, not in a section of its own far from it.
- Show logos in one muted row with equal optical size and alt text naming each company.
- Mark up a quote as blockquote with the attribution in a footer or figcaption.
- Do not rotate quotes in an auto-advancing carousel.

**Seen in**

- [Slack](https://slack.com/pricing): Pricing page: a row of customer logos under the heading
- [Stripe](https://stripe.com/): Home page: a strip of customer logos under the hero
- [Vercel](https://vercel.com/): Home page: customer logos, then sections built around a named customer and a result

**Alternatives:** [Stat tile](#stat-tile), [Card](#card)

**Sources:** Jen Cardello 2014, *Social Proof in the User Experience* (Social Proof in the User Experience); Huei-Hsin Wang 2024, *Homepage Design: 5 Fundamental Principles* (Homepage Design: 5 Fundamental Principles)

### FAQ

<a id="faq"></a>

`faq` · also called frequently asked questions, questions and answers

A list of questions, each followed by a short answer, often shown as an accordion.

**Use when**

- Real users keep asking the same questions and the answers are short
- The questions do not belong to any one page or step, for example before buying

**Avoid when**

- The answer belongs in the page or step where the question arises; GOV.UK avoids FAQs for this reason
- The list is invented by the team rather than taken from support or search data
- It would grow into a dumping ground of dozens of items

**Rules**

- Use questions people actually ask, in their words, starting with the key term.
- Answer in the first sentence; link to detail.
- Group by topic under headings when there are more than about eight.
- Show as an accordion only when the list is long; mark each question up as a heading containing a button.
- Keep the content in the page so find-in-page and search engines reach it.
- Review the list regularly and move answers into the product where they belong.

**Seen in**

- [GitHub](https://github.com/pricing): Pricing page: a "Frequently asked questions" section after the plans
- [U.S. Web Design System](https://designsystem.digital.gov/components/accordion/): Accordion: for pages where users need only a few specific pieces of content
- Slack: Pricing page: questions and answers in an accordion after the plan comparison (not re-checked)

**Alternatives:** [Accordion sections](#accordion-sections), [Disclosure](#disclosure)

**Sources:** Susan Farrell 2014, *FAQs Still Deliver Great Value* (FAQs Still Deliver Great Value); Sarah Richards 2013, *FAQs: why we don't have them* (FAQs: why we don't have them); Huei-Hsin Wang 2023, *Accordions on Desktop: When and How to Use* (Accordions on Desktop: When and How to Use)

### Image with caption

<a id="figure"></a>

`figure` · also called figure, captioned image

An image with a line of text beneath it that says what it shows.

**Use when**

- The image carries information that needs context: who, what, where, source
- The image is referred to from the text

**Avoid when**

- The image is decoration
- The caption would repeat the adjacent heading

**Rules**

- Mark up as figure with figcaption; write alt text that describes the image and a caption that adds context, not the same words twice.
- Set the caption directly under the image in a smaller size, at the same width as the image.
- Set width and height or aspect-ratio so the page does not shift when the image loads.
- Let the image scale with max-width: 100% and serve sizes with srcset.
- If the image opens larger, make it a link or button with a name.

**Seen in**

- [Wikipedia](https://en.wikipedia.org/wiki/Typography): Articles: images in a side column, each with a caption beneath
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/image-views): Image views
- [W3C WAI tutorials](https://www.w3.org/WAI/tutorials/images/): Images tutorial: text alternatives for informative, decorative and complex images

**Alternatives:** [Thumbnail grid](#thumbnail-grid), [Lightbox](#lightbox), [Card](#card)

**Sources:** W3C Web Accessibility Initiative, *Web Accessibility Tutorials* (Images); Adam Wathan 2018, *Refactoring UI* (Working with Images); Ethan Marcotte 2014, *Responsive Web Design* (Flexible Images)

## Feedback

<a id="feedback"></a>

### Inline error message

<a id="inline-error"></a>

`inline-error` · also called field error, validation message

A message next to a form field that says what is wrong with the value and how to fix it.

**Use when**

- A field's value is missing or cannot be used
- The user must be able to see the problem and the field together

**Avoid when**

- The problem is not tied to one field, such as a failed payment (use a banner or error summary)
- The message would only say "Invalid"

**Rules**

- Place the message between the label and the field, or directly under the field, in the same place for every field.
- Say what happened and what to do in the words of the label: "Enter an email address in the format name@example.com".
- Mark the field with a red border and an icon or the word "Error"; never color alone.
- Set aria-invalid="true" on the field and link the message with aria-describedby.
- Keep the user's input in the field so they can correct it.
- Remove the message as soon as the value becomes valid.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/error-message/): Error message: shown next to the field, with a visually hidden "Error:" prefix
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/forms/text-field): Text field: an error message displayed below the field and announced to screen readers
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines): Text input: the invalid state with an error message
- [W3C WAI tutorials](https://www.w3.org/WAI/tutorials/forms/notifications/): Forms tutorial: user notifications

**Alternatives:** [Error summary](#error-summary), [Banner](#banner), [Toast](#toast)

**Sources:** Rachel Krause 2019, *10 Design Guidelines for Reporting Errors in Forms* (10 Design Guidelines for Reporting Errors in Forms); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Errors and Success); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Error Identification)

### Error summary

<a id="error-summary"></a>

`error-summary` · also called error list, form-level error

A box at the top of a form that lists every problem found on submit, each linking to its field.

**Use when**

- The form is validated when submitted and may have several errors
- Errors may be off screen after submit
- The page reloads on submit

**Avoid when**

- The form has one or two fields that are all in view
- It would replace messages next to the fields; use both

**Rules**

- Put it at the top of the main content, above the page heading, and move keyboard focus to it when the page loads with errors.
- Give it a heading such as "There is a problem" and list each error as a link that moves focus to the field.
- Use the same wording in the summary and next to the field.
- Give the container role="alert" or focus it so screen readers announce it.
- Add "Error: " to the start of the page title.
- Show it together with inline messages, never instead of them.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/error-summary/): Error summary: at the top of the page, with an error message next to each field
- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/validation/): Recover from validation errors pattern
- [W3C WAI tutorials](https://www.w3.org/WAI/tutorials/forms/notifications/): Forms tutorial: listing errors at the top of the form

**Alternatives:** [Inline error message](#inline-error), [Banner](#banner)

**Sources:** Government Digital Service, *GOV.UK Design System* (Error summary); Rachel Krause 2019, *10 Design Guidelines for Reporting Errors in Forms* (10 Design Guidelines for Reporting Errors in Forms); Adam Silver 2018, *Form Design Patterns* (A Registration Form)

### Toast

<a id="toast"></a>

`toast` · also called snackbar, flag, transient notification

A small message that appears at the edge of the screen for a few seconds to confirm something, and then goes away.

**Use when**

- An action the user just took has succeeded and nothing more is needed
- The message can be missed without harm
- An "Undo" should be offered briefly

**Avoid when**

- The message is an error or needs a decision
- The user must read it to continue
- It reports something the user did not just do

**Rules**

- Keep it to one short sentence and at most one action.
- Show one at a time, at a fixed position that does not cover navigation or the main action.
- Leave it up long enough to read (Material suggests 4–10 seconds), pause the timer on hover and focus, and do not auto-dismiss toasts that carry an action unless the action is available elsewhere.
- Announce it with role="status" (polite); do not move focus to it.
- Do not rely on it alone on the web: also show the result in the page, such as the saved value or the new row.

**Seen in**

- [Material Design 3](https://m3.material.io/components/snackbar/guidelines): Snackbar: brief updates about app processes at the bottom of the screen
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/toast-api): Toast API: a short non-disruptive message
- [Atlassian Design System](https://atlassian.design/components/flag/usage): Flag: confirmations, alerts and acknowledgments at the edge of the screen
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/toast/usage): Toast

**Alternatives:** [Inline confirmation](#inline-confirmation), [Banner](#banner), [Confirmation page](#confirmation-page), [Undo instead of confirm](#undo)

**Sources:** Google, *Material Design 3* (Snackbar); Adam Silver 2020, *The problem with toast messages and what to do instead* (The problem with toast messages and what to do instead); Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications)

### Banner

<a id="banner"></a>

`banner` · also called alert, notification banner, message bar, callout, system message

A full-width strip or box at the top of the page or section with a message that stays until it is dealt with or dismissed.

**Use when**

- The message is about the whole page or account: an outage, an expiring trial, a failed sync
- The message should persist until resolved
- A result needs to be confirmed after a page reload

**Avoid when**

- The message belongs to one field (use an inline error)
- It is a brief success that needs no follow-up (use a toast)
- It must block everything until answered (use a dialog)

**Rules**

- Place it under the header, above the page content it concerns, at the width of that content.
- Use four meanings at most (information, success, warning, error), each with its own icon as well as color.
- Write a short heading and one sentence, with at most one or two actions as links or buttons.
- Let users dismiss it when it is informational; keep it while a problem still exists.
- Use role="alert" only for urgent messages that appear without a reload; otherwise role="status" or a labelled region.
- Do not stack several banners; combine or prioritize them.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/notification-banner/): Notification banner: something the user needs to know that is not directly part of the page content
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/banner): Banner
- [U.S. Web Design System](https://designsystem.digital.gov/components/alert/): Alert: info, warning, success, error and emergency
- [Stripe](https://stripe.com/): Home page: a dismissible announcement strip above the header

**Alternatives:** [Toast](#toast), [Inline error message](#inline-error), [Modal dialog](#modal-dialog)

**Sources:** Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications); IBM, *Carbon Design System* (Notification); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Status Messages)

### Progress bar

<a id="progress-bar"></a>

`progress-bar` · also called determinate progress, percent-done indicator

A bar that fills from empty to full to show how much of a known amount of work is done.

**Use when**

- The work takes more than about 10 seconds
- Progress can be measured: bytes, items, steps
- The user may want to wait, leave or cancel

**Avoid when**

- The wait is short (use a spinner or nothing)
- Progress cannot be estimated (use an indeterminate indicator and say what is happening)

**Rules**

- Move only forward and reflect real progress; do not jump back or stall at 99%.
- Label what is happening and how far: "Uploading 3 of 12 files".
- Offer Cancel for long operations and let the user keep working if they can.
- Use the progress element or role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax and a name.
- Say when it is finished; do not just remove the bar.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/progress-bar/guidelines): Progress bar
- [Material Design 3](https://m3.material.io/components/progress-indicators/guidelines): Progress indicators: determinate and indeterminate, linear and circular
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/progress-indicators): Progress indicators
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/progressbar/usage): ProgressBar

**Alternatives:** [Spinner](#spinner), [Skeleton screen](#skeleton), [Step indicator](#step-indicator)

**Sources:** Katie Sherwin 2014, *Progress Indicators Make a Slow System Less Insufferable* (Progress Indicators Make a Slow System Less Insufferable); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits); Jeff Johnson 2020, *Designing with the Mind in Mind: Simple Guide to Understanding User Interface Design Guidelines* (We Have Time Requirements)

### Spinner

<a id="spinner"></a>

`spinner` · also called loading indicator, activity indicator, indeterminate progress

A small looping animation that shows that something is in progress without saying how long it will take.

**Use when**

- The wait is between about 1 and 10 seconds
- The work cannot be measured
- Only part of the screen is waiting: a button, a panel, a list

**Avoid when**

- The wait is under about a second (show nothing; a flash of spinner is distracting)
- The wait is long (use a progress bar)
- A whole page of known structure is loading (use a skeleton)

**Rules**

- Put it where the result will appear, or inside the button that started the action.
- Delay showing it for a few hundred milliseconds so fast responses show none.
- Add text for waits over a few seconds: "Saving…", "Loading results…".
- Disable the trigger while waiting, but keep it focusable and keep its width.
- Announce the state with role="status" or aria-busy on the region; respect prefers-reduced-motion.
- Time out with an error and a retry instead of spinning forever.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/loading/guidelines): Loading
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/inline-loading/guidelines): Inline loading: feedback for an action in progress, next to its trigger
- [Atlassian Design System](https://atlassian.design/components/spinner/usage): Spinner
- [Shopify Polaris](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/spinner): Spinner

**Alternatives:** [Skeleton screen](#skeleton), [Progress bar](#progress-bar), [Optimistic update](#optimistic-update)

**Sources:** Katie Sherwin 2014, *Progress Indicators Make a Slow System Less Insufferable* (Progress Indicators Make a Slow System Less Insufferable); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Spinners and Loading Indicators); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits)

### Skeleton screen

<a id="skeleton"></a>

`skeleton` · also called skeleton loader, placeholder, content placeholder, shimmer

Grey shapes in the layout of the content that is about to appear, shown while it loads.

**Use when**

- A page or panel with a known layout is loading
- Content arrives within a few seconds
- The layout should not jump when data arrives

**Avoid when**

- The wait is very short or the layout is not known in advance
- The operation is long and measurable (use a progress bar)
- It would be a single grey block, which is no better than a spinner

**Rules**

- Match the real layout: same number of rows, same image boxes, same heights, so nothing moves when content replaces it.
- Show real static parts (header, navigation, titles) at once and skeletons only for what is loading.
- Use a slow, subtle pulse or sheen and switch it off under prefers-reduced-motion.
- Set aria-busy="true" on the loading region and hide the placeholder shapes from assistive technology.
- Replace it with an empty state or an error when there is nothing to show; never leave it up.

**Seen in**

- [Atlassian Design System](https://atlassian.design/components/skeleton/usage): Skeleton
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/skeleton/usage): Skeleton
- [GitHub Primer](https://primer.style/product/components/skeleton-box/): SkeletonBox
- [GitLab Pajamas](https://design.gitlab.com/components/skeleton-loader/): Skeleton loader

**Alternatives:** [Spinner](#spinner), [Progress bar](#progress-bar), [Empty state](#empty-state)

**Sources:** Samhita Tankala 2023, *Skeleton Screens 101* (Skeleton Screens 101); GitHub, *Primer Design System* (Loading); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Doherty Threshold)

### Confirmation page

<a id="confirmation-page"></a>

`confirmation-page` · also called success page, thank-you page, receipt

A separate page shown after a transaction is completed that says it worked, gives a reference and explains what happens next.

**Use when**

- A multi-step transaction has ended: an order, an application, a booking, a payment
- The user needs a reference number or a record
- There are next steps or waiting times to explain

**Avoid when**

- The action was a small in-page change (use an inline confirmation or a toast)
- The user will carry on working in the same screen

**Rules**

- Say what was completed in the heading, in the past tense: "Application complete".
- Show the reference number prominently and say that a confirmation was sent, and where.
- Explain what happens next and when, and give a contact for problems.
- Offer a way to keep a record: print, download or email.
- Do not let Back or reload submit the transaction again.
- Offer one next action, not a dead end.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/confirmation-pages/): Confirmation pages: reference number, confirmation email, "What happens next"
- [GOV.UK Design System](https://design-system.service.gov.uk/components/panel/): Panel: the highlighted box at the top of a confirmation page
- Amazon: After checkout: an order-placed page with the order number and delivery estimate (not re-checked)

**Alternatives:** [Toast](#toast), [Inline confirmation](#inline-confirmation), [Banner](#banner)

**Sources:** Government Digital Service, *GOV.UK Design System* (Confirmation pages); Luke Wroblewski 2008, *Web Form Design: Filling in the Blanks* (Errors and Success); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Peak-End Rule)

### Inline confirmation

<a id="inline-confirmation"></a>

`inline-confirmation` · also called inline success message, saved indicator, inline status

A short success message or tick that appears next to the control the user just used.

**Use when**

- A single field or setting was saved in place
- The user's eyes are already on the control
- Autosave needs to show its state

**Avoid when**

- The result affects the whole page or another page
- The confirmation must be kept as a record

**Rules**

- Show it right next to the control or in place of the button label: "Saved", with a tick.
- Show "Saving…" first when the save is not instant, then replace it with the result.
- Keep it for a few seconds or until the next change; a persistent "Last saved 10:42" is better for documents.
- Put it in a role="status" region so it is announced without moving focus.
- On failure show the error in the same place, in words, with a way to retry.

**Seen in**

- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/inline-loading/guidelines): Inline loading: active, finished and error states beside the control
- [GitHub Primer](https://primer.style/product/components/inline-message/): InlineMessage: feedback about an action, placed near it
- [GitLab Pajamas](https://design.gitlab.com/patterns/saving-and-feedback/): Saving and feedback

**Alternatives:** [Toast](#toast), [Banner](#banner), [Confirmation page](#confirmation-page)

**Sources:** Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications); GitHub, *Primer Design System* (Saving); Don Norman 2013, *The Design of Everyday Things* (The Psychopathology of Everyday Things)

### Badge counter

<a id="badge-counter"></a>

`badge-counter` · also called notification badge, count badge, unread dot

A small dot or number on an icon or menu item that shows that there is something new, and how much.

**Use when**

- A destination has new or unread items the user may want to see
- A count helps decide whether to look

**Avoid when**

- The number is not about new items (show it as text)
- Every item would have one; the signal is lost
- It is used to draw attention to promotions

**Rules**

- Place it at the top trailing corner of the icon, overlapping it slightly.
- Use a dot for "something new" and a number for a count; cap the number ("99+").
- Clear it when the user has seen the items, and only then.
- Use one strong color with sufficient contrast for both the badge and its text.
- Include the count in the control's accessible name: "Inbox, 3 unread".

**Seen in**

- [Material Design 3](https://m3.material.io/components/badges/guidelines): Badges: small for a dot, large for a count of up to four characters
- [Atlassian Design System](https://atlassian.design/components/badge/usage): Badge: a numeric count
- [GitHub Primer](https://primer.style/product/components/counter-label/): CounterLabel
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/info-badge): Info badge

**Alternatives:** [Status badge](#status-badge), [Banner](#banner)

**Sources:** Google, *Material Design 3* (Badges); Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications); Apple, *Human Interface Guidelines* (Notifications)

### Optimistic update

<a id="optimistic-update"></a>

`optimistic-update` · also called optimistic UI, instant feedback

The interface shows the result of an action at once, before the server has confirmed it, and corrects itself if the request fails.

**Use when**

- The action almost always succeeds: like, star, rename, reorder, send a message
- The server response is slow enough to notice
- The action is easy to reverse

**Avoid when**

- Failure is common or costly: payments, bookings, anything irreversible
- The server computes the result, so the client cannot predict it

**Rules**

- Update the interface in the same frame as the click and send the request in the background.
- On failure restore the previous state and say what happened next to the item, with "Try again".
- Show pending items subtly (lighter text, a small clock) when later actions depend on them.
- Keep the order of rapid actions; do not let a slow early response overwrite a later one.
- Never show an optimistic success message for something that must be recorded, such as an order.

**Seen in**

- [React](https://react.dev/reference/react/useOptimistic): useOptimistic: show a different state while an async action is under way
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates): Optimistic updates guide
- X: The like button fills and the count changes at once when tapped (not re-checked)

**Alternatives:** [Spinner](#spinner), [Inline confirmation](#inline-confirmation)

**Sources:** Denys Mishunov 2016, *True Lies Of Optimistic User Interfaces* (True Lies Of Optimistic User Interfaces); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits); Jon Yablonski 2024, *Laws of UX: Using Psychology to Design Better Products & Services* (Doherty Threshold)

### Validate on leaving a field

<a id="validate-on-blur"></a>

`validate-on-blur` · also called inline validation, live validation, on-blur validation

Each field is checked when the user moves on from it, and the result is shown next to it.

**Use when**

- The form is long, or errors are common and costly to find late
- A field has a rule the user can fix on the spot: format, length, availability
- The form is one page

**Avoid when**

- The form has one field per page (validating on submit is the same moment)
- Checking needs the whole form, such as "enter a phone number or an email address"
- Messages would appear while the user is still typing

**Rules**

- Validate when the field loses focus, not on every keystroke; Baymard reports that premature messages are a common fault.
- Once a field is in error, re-check it as the user types and remove the message the moment it is fixed.
- Do not flag empty required fields until the user tries to submit.
- Use success ticks only where confirmation helps, such as username availability or password rules.
- Still validate everything on submit and then show an error summary.
- Announce new messages through aria-describedby and a polite live region.

**Seen in**

- [Atlassian Design System](https://atlassian.design/components/form/usage): Form: validate inline, and never disable the submit button
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/field/usage): Field: inline feedback after validation, with a message under the field
- Stripe Checkout: Card fields show a message when an incomplete number is left (not re-checked)

**Alternatives:** [Validate on submit](#validate-on-submit)

**Sources:** Edward Scott 2024, *Usability Testing of Inline Form Validation* (Usability Testing of Inline Form Validation); Luke Wroblewski 2009, *Inline Validation in Web Forms* (Inline Validation in Web Forms); Vitaly Friedman 2022, *A Complete Guide To Live Validation UX* (A Complete Guide To Live Validation UX)

### Validate on submit

<a id="validate-on-submit"></a>

`validate-on-submit` · also called submit validation, form-level validation

Nothing is checked until the user presses the submit button; then all problems are shown together.

**Use when**

- The form is short or asks one thing per page
- Fields depend on each other
- The service must work without JavaScript

**Avoid when**

- The form is long and a late error means scrolling back through many fields
- A rule can only be met by trial and error, such as an available username

**Rules**

- Keep the submit button enabled; disabling it hides what is wrong.
- On submit show an error summary at the top and a message at each field, and move focus to the summary.
- Keep all entered values.
- Turn off the browser's own validation bubbles (novalidate) so messages are consistent and accessible.
- Validate on the server as well; client checks are a convenience.
- After the first failed submit, switch that field to live re-checking so messages clear as the user fixes them.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/patterns/validation/): Recover from validation errors: validate on submit and turn off HTML5 validation
- [GOV.UK Design System](https://design-system.service.gov.uk/components/error-summary/): Error summary shown after submitting

**Alternatives:** [Validate on leaving a field](#validate-on-blur)

**Sources:** Government Digital Service, *GOV.UK Design System* (Recover from validation errors); Adam Silver 2017, *The problem with live validation and what to do instead* (The problem with live validation and what to do instead); Adam Silver 2023, *The problem with disabled buttons and what to do instead* (The problem with disabled buttons and what to do instead)

## Overlays

<a id="overlay"></a>

### Modal dialog

<a id="modal-dialog"></a>

`modal-dialog` · also called modal, dialog box, modal window

A window that opens over the page and must be completed or closed before the page can be used again.

**Use when**

- A short, self-contained task must be finished or abandoned before continuing: a small form, a required choice
- The user started it on purpose
- Keeping the page visible behind it gives useful context

**Avoid when**

- The user needs to look at or copy from the page while answering
- The content is long or has several steps (use a page or a full-screen takeover)
- The system opens it uninvited: sign-up prompts, surveys, announcements

**Rules**

- Use the dialog element with showModal(), or role="dialog" with aria-modal="true" and a name from the title.
- Move focus into the dialog on open, keep Tab inside it, and return focus to the trigger on close.
- Close on Escape and with a visible close button; close on a click outside only when nothing typed would be lost.
- Give it a title that says what it is for, the body, and actions at the bottom with one primary button.
- Dim the page behind it and stop it from scrolling.
- On phones make it full width or full screen; never open a dialog from a dialog.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): Dialog (modal) pattern
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): Reference page for the dialog element and showModal()
- [Material Design 3](https://m3.material.io/components/dialogs/guidelines): Dialogs: basic and full-screen
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines): Modal: passive, transactional, danger and acknowledgment variants

**Alternatives:** [Side sheet](#side-sheet), [Popover](#popover), [Full-screen takeover](#full-screen-takeover), [Inline edit](#inline-edit), [Disclosure](#disclosure)

**Sources:** Therese Fessenden 2017, *Modal & Nonmodal Dialogs: When (& When Not) to Use Them* (Modal & Nonmodal Dialogs: When (& When Not) to Use Them); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Dialog (modal) pattern)

### Confirmation dialog

<a id="confirmation-dialog"></a>

`confirmation-dialog` · also called alert dialog, confirm prompt, are-you-sure dialog

A small modal that asks the user to confirm or cancel an action before it happens.

**Use when**

- The action cannot be undone and has real consequences
- The action is rare enough that the question will be read

**Avoid when**

- The action can be undone (do it and offer undo)
- The action is routine; a dialog shown every time is confirmed without reading
- It asks "Are you sure?" without saying what will happen

**Rules**

- Title it with the action as a question: "Delete 3 files?"; say in the body what will be lost and that it cannot be undone.
- Label the buttons with the outcomes: "Delete files" and "Cancel", never "Yes" and "No" or "OK".
- Put initial focus on the safe choice and let Escape cancel.
- Style the confirming button as destructive when it destroys something.
- Use role="alertdialog" with the title and description linked.
- Use it sparingly so that it keeps its force.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/): Alert and message dialogs pattern
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/alerts): Alerts: for example warning when an action might destroy data
- [GitHub Primer](https://primer.style/product/components/confirmation-dialog/): ConfirmationDialog
- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/win32/uxguide/mess-confirm): Windows confirmation guidelines

**Alternatives:** [Undo instead of confirm](#undo), [Typed confirmation](#typed-confirmation), [Destructive button](#destructive-button)

**Sources:** Jakob Nielsen 2018, *Confirmation Dialogs Can Prevent User Errors* (Confirmation Dialogs Can Prevent User Errors); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Preventing Errors and Informing Decisions); Don Norman 2013, *The Design of Everyday Things* (Human Error? No, Bad Design)

### Typed confirmation

<a id="typed-confirmation"></a>

`typed-confirmation` · also called type to confirm, confirmation phrase

A confirmation dialog whose confirm button works only after the user types the name of the thing being destroyed.

**Use when**

- The action destroys something large or shared and cannot be reversed: a repository, a database, an account
- A mistaken click would be very costly
- The action is rare

**Avoid when**

- The action is reversible or small; the friction is out of proportion
- The action is done in bulk or often

**Rules**

- State exactly what will be deleted and what else goes with it.
- Ask the user to type the item's own name (not a generic word like "DELETE"), shown in the dialog so it can be read, in a labelled text field.
- Enable the destructive button only when the text matches; compare exactly but ignore leading and trailing spaces.
- Allow paste, so people who copy the name are not blocked.
- Keep Cancel available and make it the default.

**Seen in**

- [GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository): Deleting a repository: type the name of the repository to confirm
- [GitLab Pajamas](https://design.gitlab.com/patterns/destructive-actions/): Destructive actions: more friction for higher severity
- Amazon Web Services: Deleting an S3 bucket: type the bucket name to confirm (not re-checked)

**Alternatives:** [Confirmation dialog](#confirmation-dialog), [Undo instead of confirm](#undo)

**Sources:** Don Norman 2013, *The Design of Everyday Things* (Human Error? No, Bad Design); GitLab, *Pajamas Design System* (Destructive actions); Jakob Nielsen 2018, *Confirmation Dialogs Can Prevent User Errors* (Confirmation Dialogs Can Prevent User Errors)

### Side sheet

<a id="side-sheet"></a>

`side-sheet` · also called drawer, side panel, slide-over

A panel that slides in from the side of the window, over or beside the page, to show details or a form.

**Use when**

- The user looks at or edits the details of an item while keeping the list in view
- The content is taller than a dialog comfortably holds
- Supplementary tools such as filters need space without leaving the page

**Avoid when**

- The task needs full attention and width (use a page)
- The content is a couple of lines (use a popover)
- The screen is a phone (use a bottom sheet or a full-screen view)

**Rules**

- Slide it in from the trailing edge, about 320–480 px wide, full height, with a title and a close button at the top.
- Decide whether it blocks the page: if it does, treat it as a modal dialog (focus trap, Escape, dimmed page); if not, let the page stay usable and scrollable.
- Keep actions in a footer that stays visible while the body scrolls.
- Changing the selected row updates the open sheet instead of stacking another.
- Return focus to the trigger when it closes.

**Seen in**

- [Material Design 3](https://m3.material.io/components/side-sheets/guidelines): Side sheets: secondary content anchored to the side of the screen
- [Atlassian Design System](https://atlassian.design/components/drawer/usage): Drawer
- [GitLab Pajamas](https://design.gitlab.com/components/drawer/): Drawer
- [Microsoft Fluent 2](https://fluent2.microsoft.design/components/web/react/core/drawer/usage): Drawer: overlay and inline

**Alternatives:** [Modal dialog](#modal-dialog), [List and detail](#list-detail), [Bottom sheet](#bottom-sheet), [Popover](#popover)

**Sources:** Google, *Material Design 3* (Side sheets); Therese Fessenden 2017, *Modal & Nonmodal Dialogs: When (& When Not) to Use Them* (Modal & Nonmodal Dialogs: When (& When Not) to Use Them); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Overlays)

### Bottom sheet

<a id="bottom-sheet"></a>

`bottom-sheet` · also called action sheet, sheet

A panel that slides up from the bottom of a phone screen and covers part of it, holding options or details.

**Use when**

- On a phone, a few actions or a short form relate to what is on screen
- The content behind should stay partly visible
- Reaching the controls with a thumb matters

**Avoid when**

- The screen is a desktop (use a dialog, popover or side sheet)
- The content is long or multi-step (use a full page)
- Several sheets would stack

**Rules**

- Show a title, a visible close button and, if draggable, a grab handle; do not rely on swipe alone to close.
- For a modal sheet dim the page and close on a tap outside; the system Back gesture should close the sheet, not leave the page.
- Size it to its content up to about half the screen; let it expand to full height only when the user drags it.
- Keep the main action at the bottom of the sheet above the safe area.
- Treat it as a dialog for assistive technology: role, name, focus moved in and returned.

**Seen in**

- [Material Design 3](https://m3.material.io/components/bottom-sheets/guidelines): Bottom sheets: standard and modal
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sheets): Sheets: a scoped task closely related to the current context
- [Android](https://developer.android.com/develop/ui/compose/components/bottom-sheets?auto_signin=false): Bottom sheets in Compose
- [shadcn/ui](https://ui.shadcn.com/docs/components/base/drawer): Drawer: a bottom sheet component

**Alternatives:** [Modal dialog](#modal-dialog), [Side sheet](#side-sheet), [Dropdown menu](#dropdown-menu)

**Sources:** Page Laubheimer 2023, *Bottom Sheets: Definition and UX Guidelines* (Bottom Sheets: Definition and UX Guidelines); Google, *Material Design 3* (Bottom sheets); Apple, *Human Interface Guidelines* (Sheets)

### Popover

<a id="popover"></a>

`popover` · also called popup, flyout, inline dialog, toggletip

A small panel that opens next to the control that triggered it and closes when the user clicks elsewhere.

**Use when**

- A little extra content or a few controls relate to one element: a color picker, a share box, a short explanation
- The user should keep their place on the page

**Avoid when**

- The content is long or has several steps
- It opens on hover and contains controls (hover content is hard to reach)
- The message is critical and must not be dismissed by accident

**Rules**

- Open it on click or Enter from a button with aria-expanded; never on hover alone.
- Anchor it to the trigger with a small gap, flip it when there is no room, and keep it inside the window.
- Close on Escape, on a click outside and on the trigger; return focus to the trigger.
- Move focus into it when it contains controls; otherwise leave focus on the trigger and link the content with aria-describedby.
- Keep it small: a title, a few lines, one or two actions.
- The HTML popover attribute gives light dismiss and top-layer placement without script.

**Seen in**

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/popovers): Popovers: a small amount of information or functionality
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines): Popover
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API): Popover API reference
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/toggletip/guidelines): Toggletip: interactive content shown on click

**Alternatives:** [Tooltip](#tooltip), [Modal dialog](#modal-dialog), [Dropdown menu](#dropdown-menu), [Disclosure](#disclosure)

**Sources:** Apple, *Human Interface Guidelines* (Popovers); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Overlays); Heydon Pickering 2019, *Inclusive Components* (Tooltips & Toggletips)

### Tooltip

<a id="tooltip"></a>

`tooltip` · also called hover hint, info tip

A short text label that appears when the pointer rests on, or keyboard focus reaches, a control.

**Use when**

- An icon-only button needs its name shown
- A truncated value needs its full text
- A brief supplement helps but is not needed to use the control

**Avoid when**

- The information is needed to complete the task; NN/g advises against putting vital information in tooltips
- The product is used on touch screens, where hover does not exist
- The content has links, formatting or more than a short sentence (use a popover)

**Rules**

- Show on hover after a short delay and on keyboard focus; hide on Escape, blur and pointer leave.
- Keep it to a few words of plain text with no interactive content.
- Let the pointer move onto the tooltip without it closing, and keep it until dismissed.
- Link it with aria-describedby, or aria-labelledby when it is the control's name; give the tip role="tooltip".
- Place it close to the control without covering it, and keep it inside the window.
- Do not put a tooltip on a disabled or non-focusable element.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/): Tooltip pattern
- [Material Design 3](https://m3.material.io/components/tooltips/guidelines): Tooltips: plain and rich
- [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/tooltip/guidelines): Tooltip
- [U.S. Web Design System](https://designsystem.digital.gov/components/tooltip/): Tooltip

**Alternatives:** [Popover](#popover), [Hint text](#help-text), [Disclosure](#disclosure)

**Sources:** Alita Kendrick 2019, *Tooltip Guidelines* (Tooltip Guidelines); Heydon Pickering 2019, *Inclusive Components* (Tooltips & Toggletips); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (Content on Hover or Focus)

### Dropdown menu

<a id="dropdown-menu"></a>

`dropdown-menu` · also called menu button, action menu, context menu, pull-down menu

A button that opens a short list of commands or links directly below it.

**Use when**

- Several related actions share one button's space
- The actions are secondary to what is visible on the page
- A navigation item has a few sub-pages

**Avoid when**

- It hides the main action of the screen
- The list is a choice of values in a form (use a select)
- There are so many items that the list scrolls (use a mega menu, a page or search)

**Rules**

- Make the trigger a button whose label names the group, with an arrow, aria-haspopup="menu" and aria-expanded.
- Open on click; Down arrow, Enter or Space opens and focuses the first item; arrows move, Escape closes and returns focus, typing a letter jumps to an item.
- Use role="menu" and menuitem for commands; for site navigation use a plain list of links in a disclosure instead.
- Keep it to about seven items or group with separators; put destructive items last.
- Give items at least 44 px height on touch screens and never make submenus open on hover only.
- Close after an item is chosen.

**Seen in**

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/): Menu button pattern
- [Material Design 3](https://m3.material.io/components/menus/guidelines): Menus: a list of choices on a temporary surface
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/menus): Menus
- [Slack](https://slack.com/pricing): Site header: "Product", "Solutions" and "Resources" open menus from the navigation bar

**Alternatives:** [Overflow menu](#overflow-menu), [Select](#select), [Popover](#popover), [Mega menu](#mega-menu)

**Sources:** Heydon Pickering 2019, *Inclusive Components* (Menus & Menu Buttons); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Menu button pattern); Alan Cooper 2014, *About Face: The Essentials of Interaction Design* (Design Details: Controls and Dialogs)

### Lightbox

<a id="lightbox"></a>

`lightbox` · also called image viewer, media viewer, zoom overlay

An overlay that dims the page and shows an image or video large, usually with controls to move to the next one.

**Use when**

- Images are shown small in the page and people want to inspect them
- A set of images is viewed in sequence without leaving the page

**Avoid when**

- The overlay would show a promotion or sign-up form the user did not ask for; NN/g describes this as a common misuse of overlays
- The image is the main content of the page (show it large in place)

**Rules**

- Open only from a user action on the thumbnail; make the thumbnail a link to the full image so it works without script.
- Treat it as a modal dialog: focus moves in, Tab stays in, Escape and a visible close button close it, focus returns to the thumbnail.
- Provide Previous and Next buttons and Left and Right arrow keys; show "3 of 12" and the caption.
- Fit the image to the window and allow zoom and pinch on touch screens.
- Update the URL per image so a view can be shared and Back closes the lightbox.
- Carry the alt text over to the large image.

**Seen in**

- [Wikipedia](https://www.mediawiki.org/wiki/Help:Extension:Media_Viewer): Media Viewer: clicking a thumbnail opens the image large over the article
- [Apple macOS](https://support.apple.com/guide/mac-help/preview-a-file-mh14119/mac): Quick Look: a large preview of a file over the current window
- Amazon: Product pages: clicking the main image opens a large viewer over the page (not re-checked)

**Alternatives:** [Modal dialog](#modal-dialog), [Carousel](#carousel), [Image with caption](#figure)

**Sources:** Kathryn Whitenton 2015, *Overuse of Overlays: How to Avoid Misusing Lightboxes* (Overuse of Overlays: How to Avoid Misusing Lightboxes); Bill Scott 2009, *Designing Web Interfaces: Principles and Patterns for Rich Interactions* (Overlays); W3C Web Accessibility Initiative, *ARIA Authoring Practices Guide (APG)* (Dialog (modal) pattern)

### Full-screen takeover

<a id="full-screen-takeover"></a>

`full-screen-takeover` · also called full-screen dialog, full-screen modal, focus mode

A view that covers the whole window for one task and returns to the previous screen when the task is finished or closed.

**Use when**

- A task needs many fields or several steps and should not be mixed with the page behind it: compose, create, edit
- The screen is a phone, where a dialog has no room
- Leaving half-way should be a deliberate act

**Avoid when**

- The task is a quick question (use a dialog)
- Users need to refer to the page behind
- The destination deserves its own URL and place in navigation (make it a page)

**Rules**

- Put a close or back control at the top leading corner, the task title in the middle and the confirming action at the top trailing corner or at the bottom.
- Ask before discarding when the user closes with unsaved input.
- Make the system Back gesture close the takeover.
- Hide the app's main navigation while it is open and bring it back unchanged afterwards.
- Treat it as a modal dialog for focus and screen readers.

**Seen in**

- [Material Design 3](https://m3.material.io/components/dialogs/guidelines): Dialogs: full-screen dialogs for tasks with several inputs
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sheets): Sheets: full-screen presentation for immersive or multi-step tasks
- Gmail on phones: Composing a message covers the screen, with close and send in the top bar (not re-checked)

**Alternatives:** [Modal dialog](#modal-dialog), [Wizard](#wizard), [Side sheet](#side-sheet)

**Sources:** Google, *Material Design 3* (Dialogs); Apple, *Human Interface Guidelines* (Modality); Jenifer Tidwell 2020, *Designing Interfaces: Patterns for Effective Interaction Design* (Modal Panel)

### Coach mark

<a id="coach-mark"></a>

`coach-mark` · also called onboarding tour, product tour, teaching tip, spotlight, feature callout

A small callout attached to a control that explains it, shown on first use or when a feature is new.

**Use when**

- A feature is new or easy to miss and matters to the user's current task
- One tip in context is enough

**Avoid when**

- A chain of tips stands between a new user and the product; NN/g reports that tutorials interrupt users and are quickly forgotten
- The control could be made clear with a label instead
- It would appear on every visit

**Rules**

- Show one tip at a time, next to the control it is about, when the user reaches that part of the product.
- Keep it to a title and one or two sentences, with "Got it" and, in a sequence, "Skip".
- Do not block the control it points at; let the user try it straight away.
- Show each tip once per user and never bring back a dismissed tip.
- Make the tip reachable and dismissible by keyboard and announce it without stealing focus from typing.
- Keep the same help available later in a help menu.

**Seen in**

- [Microsoft Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/teaching-tip): Teaching tip: a notification about new or important features, attached to an element
- [Atlassian Design System](https://atlassian.design/components/spotlight/usage): Spotlight: introduces features through focused messages
- [GitHub Primer](https://primer.style/product/ui-patterns/feature-onboarding/): Feature onboarding pattern
- [GitLab Pajamas](https://design.gitlab.com/patterns/feature-discovery/): Feature discovery

**Alternatives:** [Empty state](#empty-state), [Tooltip](#tooltip), [Banner](#banner)

**Sources:** Aurora Harley 2014, *Instructional Overlays and Coach Marks for Mobile Apps* (Instructional Overlays and Coach Marks for Mobile Apps); Page Laubheimer 2023, *Onboarding Tutorials vs. Contextual Help* (Onboarding Tutorials vs. Contextual Help); Apple, *Human Interface Guidelines* (Onboarding)

### Cookie banner

<a id="cookie-banner"></a>

`cookie-banner` · also called consent banner, cookie notice, privacy prompt

A notice shown on first visit that asks whether non-essential cookies may be set.

**Use when**

- The site sets cookies or similar storage that are not strictly necessary
- The law that applies to the audience requires consent before they are set

**Avoid when**

- The site sets only essential cookies (a cookies page is enough)
- It would be used to push acceptance with a hidden or missing reject option

**Rules**

- Offer "Accept" and "Reject" as buttons of equal size and weight, plus a link to settings or details.
- Say in one or two sentences what the cookies are for.
- Set no non-essential cookies until the user accepts, and remember either answer.
- Place it at the top or bottom of the page without covering content the user needs; do not block the page with a modal unless the law requires an answer first.
- Render it without shifting the page layout and keep it early in the focus order.
- After a choice, confirm it and say where it can be changed.

**Seen in**

- [GOV.UK Design System](https://design-system.service.gov.uk/components/cookie-banner/): Cookie banner: accept or reject non-essential cookies, with a link to view cookies
- [GOV.UK](https://www.gov.uk/learn-to-drive-a-car): Top of the page: "Accept additional cookies" and "Reject additional cookies" as equal buttons
- [Stripe](https://stripe.com/): Bottom corner: a small box with "Accept all" and "Reject all"
- [The Guardian](https://www.theguardian.com/international): Bottom of the page: a panel with "Yes, I accept", "No, thank you" and "Manage cookies"

**Alternatives:** [Banner](#banner), [Modal dialog](#modal-dialog)

**Sources:** Samhita Tankala 2023, *Cookie Permissions 101* (Cookie Permissions 101); Katie Hempenius 2021, *Best practices for cookie notices* (Best practices for cookie notices); Government Digital Service, *GOV.UK Design System* (Cookie banner)

## Motion

<a id="motion"></a>

### Instant change

<a id="instant-change"></a>

`instant-change` · also called no animation, cut

The change happens at once, with no animation.

**Use when**

- The action is repeated a hundred times a day or more: a keyboard shortcut, the command palette, moving through a list
- The action is started from the keyboard
- The screen is dense with data that the person is reading or acting on
- No purpose can be named for a motion: feedback, where something came from, what changed

**Avoid when**

- Content appears or disappears so abruptly that people lose track of what changed (bridge it with a short fade)
- A press gets no visible answer at all (give it press feedback)

**Rules**

- Show the new state within 100 ms of the action; an instant change that arrives late is worse than an animated one.
- Keep the feedback that does not move: hover, focus, pressed and selected styles still change, at once.
- When the choice is between a subtle motion and none on something used all day, choose none.

**Seen in**

- [Emil Kowalski](https://emilkowal.ski/ui/you-dont-need-animations): You Don't Need Animations: a menu and a list shown with and without animation, and why the one used hundreds of times a day should have none
- Raycast: The command window opens and closes with no animation (not re-checked)

**Motion**

- Plays on: state, open, navigate
- Right up to: constant use (a hundred times a day or more: keyboard shortcuts, the command palette, core navigation)
- Intensity: none
- Reduced motion: Nothing to reduce: nothing moves.

**Alternatives:** [Fade in](#fade-in), [Crossfade](#crossfade), [Press feedback](#press-scale)

**Sources:** Emil Kowalski, *You Don't Need Animations* (Frequency of use); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits)

### Press feedback

<a id="press-scale"></a>

`press-scale` · also called press scale, tap feedback, active state

A button shrinks slightly while it is pressed and returns when it is released.

**Use when**

- A press has no visible answer of its own
- The control is a button, card or tile that is tapped or clicked, on touch screens above all

**Avoid when**

- The control is pressed many times in a row, such as a stepper or a key of a keypad (change its color instead)
- The control is a text link inside a sentence
- The element is large: scaling a whole row or panel by 3% moves its edges visibly

**Rules**

- Scale to between 0.96 and 0.98; below that it reads as a bounce, not a press.
- Take 100–160 ms with an ease-out curve, so the answer starts with the press.
- Animate transform only; never width, height or padding.
- Keep the pressed color or shadow as well, so the state does not rest on movement alone.
- Under reduced motion drop the scale and keep the color change.

**Seen in**

- [Emil Kowalski](https://emilkowal.ski/ui/7-practical-animation-tips): 7 Practical Animation Tips: a button that scales to 0.97 while it is pressed

**Motion**

- Plays on: press
- Purpose: feedback
- Right up to: frequent use (tens of times a day: hover, moving through a list, a toggle used all the time)
- Intensity: subtle
- Duration: 100–160 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `transform`
- Reduced motion: No scale; the pressed color still changes.

```css
.btn { transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1); }
.btn:active { transform: scale(0.97); }
@media (prefers-reduced-motion: reduce) {
  .btn { transition: none; }
  .btn:active { transform: none; }
}
```

**Alternatives:** [Instant change](#instant-change), [Hold to confirm](#hold-to-confirm)

**Sources:** Emil Kowalski, *7 Practical Animation Tips* (Scale your buttons); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); Dan Saffer 2013, *Microinteractions: Designing with Details* (ch. 4, Feedback)

### Hold to confirm

<a id="hold-to-confirm"></a>

`hold-to-confirm` · also called press and hold, hold button

A button that must be held down while a fill runs across it; letting go early cancels.

**Use when**

- The action cannot be undone and a slip would be costly: delete for good, publish, send to everyone
- A confirmation dialog would interrupt a flow that people repeat

**Avoid when**

- The action can be undone (offer undo instead)
- The action is frequent; holding slows people down on purpose
- No other way is offered to people who use a keyboard, a switch or voice

**Rules**

- Fill from the leading edge at constant speed over 1 to 2 seconds, so the time left can be read from the fill.
- On release before the end, run the fill back in about 200 ms and do nothing.
- Say what to do in the label: "Hold to delete".
- Give keyboard and assistive-technology users another way: Enter or Space opens a confirmation instead.
- When the hold completes, show the result in the button: the label changes to what happened.
- The fill stays under reduced motion: it is progress, not decoration.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-hold-button): Hold to publish: holding fills the pill from the left; letting go early sends the fill back
- [Kokonut UI](https://kokonutui.com/docs/buttons/hold-button): Hold button (not re-checked)

**Motion**

- Plays on: press
- Purpose: feedback
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: moderate
- Duration: 1000–2000 ms, `linear`
- Changes: `clip-path`
- Reduced motion: The fill while holding stays, because it shows how long to hold; it goes back at once instead of running back.

```css
.hold { position: relative; }
.hold::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: 0.18; clip-path: inset(0 100% 0 0); transition: clip-path 200ms cubic-bezier(0.22, 1, 0.36, 1); }
.hold:active::after { clip-path: inset(0); transition: clip-path 1500ms linear; }
@media (prefers-reduced-motion: reduce) {
  .hold::after { transition: none; }
}
```

**Alternatives:** [Confirmation dialog](#confirmation-dialog), [Undo instead of confirm](#undo), [Typed confirmation](#typed-confirmation), [Press feedback](#press-scale)

**Sources:** Aza Raskin 2007, *Never Use a Warning When you Mean Undo* (Never Use a Warning When you Mean Undo); Jakob Nielsen 2018, *Confirmation Dialogs Can Prevent User Errors* (Confirmation Dialogs Can Prevent User Errors); Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback)

### Hover lift

<a id="hover-lift"></a>

`hover-lift` · also called card hover, raise on hover

A card or tile rises a few pixels and its shadow deepens while the pointer is over it.

**Use when**

- The whole card is one link or button and little else says so
- People browse a grid of cards on a marketing page, a catalog or a gallery

**Avoid when**

- Rows of a dense table or list that the pointer crosses all the time
- The card is not clickable; a lift promises an action
- It would be the only sign that the card can be clicked: touch screens have no hover

**Rules**

- Move 2–4 px up and deepen the shadow; do not scale the card, which blurs its text.
- 150–200 ms with an ease-out curve on the way in; the same or faster on the way out.
- Apply it only where hover exists: @media (hover: hover) and (pointer: fine).
- Show the same emphasis on keyboard focus, together with a visible focus ring.
- Under reduced motion keep the shadow or border change and drop the movement.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-fan-cards): Fan cards: each card lifts and grows a little while the pointer is over it
- [Material Design 3](https://m3.material.io/components/cards/specs): Cards: an elevated card rises one level while hovered (not re-checked)

**Motion**

- Plays on: hover
- Purpose: feedback
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: subtle
- Duration: 150–200 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `transform`, `box-shadow`
- Reduced motion: The shadow still deepens; the card does not move.

```css
@media (hover: hover) and (pointer: fine) {
  .card { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1); }
  .card:hover, .card:focus-within { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16); }
}
@media (prefers-reduced-motion: reduce) {
  .card { transition: box-shadow 180ms; }
  .card:hover, .card:focus-within { transform: none; }
}
```

**Alternatives:** [Instant change](#instant-change)

**Sources:** Emil Kowalski, *7 Practical Animation Tips* (Keep your animations fast); Josh W. Comeau 2021, *An Interactive Guide to CSS Transitions* (Action-driven motion); Google, *Material Design 3* (Cards)

### Icon swap

<a id="icon-swap"></a>

`icon-swap` · also called icon morph, copy to check

An icon changes into another at the moment its state changes: copy becomes a check, an outlined heart fills.

**Use when**

- A small action finishes at once and the control itself can say so: copy, like, save, mute
- A toast would be too much for the action

**Avoid when**

- The result needs words, a link or an undo (use an inline confirmation or a toast)
- The action can fail; an icon alone cannot explain an error

**Rules**

- The old icon fades and shrinks out while the new one fades and grows in, in 150–200 ms; both sit in the same box, so the control keeps its size.
- Start the new icon from a scale of 0.8 or more, never from 0.
- Change the accessible name or announce the result in a live region as well; the icon alone is not a message.
- Return to the first icon after about 2 seconds if the state is momentary, such as Copied.
- Under reduced motion swap by opacity only.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-copy-button): Copy button: the copy icon shrinks away while a check pops in and the word changes to Copied
- [DesignBookmark Motion](https://designbookmark.com/motion#db-like-burst): Like burst: the heart squashes, bounces up and fills

**Motion**

- Plays on: state
- Purpose: feedback
- Right up to: frequent use (tens of times a day: hover, moving through a list, a toggle used all the time)
- Intensity: subtle
- Duration: 150–200 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: The icons swap with a fade and do not change size.

```css
.swap { display: inline-grid; }
.swap > * { grid-area: 1 / 1; transition: opacity 160ms ease-out, transform 160ms cubic-bezier(0.22, 1, 0.36, 1); }
.swap > .on, .swap[aria-pressed='true'] > .off { opacity: 0; transform: scale(0.8); }
.swap[aria-pressed='true'] > .on { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .swap > * { transition: opacity 160ms ease-out; transform: none !important; }
}
```

**Alternatives:** [Instant change](#instant-change), [Button status](#status-swap), [Inline confirmation](#inline-confirmation), [Toast](#toast)

**Sources:** Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback); Emil Kowalski, *7 Practical Animation Tips* (Don't animate from scale(0)); Dan Saffer 2013, *Microinteractions: Designing with Details* (ch. 4, Feedback)

### Button status

<a id="status-swap"></a>

`status-swap` · also called loading button, loading to success, stateful button

A button shows the progress and the result of its own action in place: the label gives way to a spinner, then to a check and a word such as Sent.

**Use when**

- The action takes between about one and ten seconds and the page stays where it is
- The button is where people look while they wait: send, save, pay, subscribe

**Avoid when**

- The action finishes at once (use an icon swap, or nothing)
- The result leads to another page (use a confirmation page)
- An error needs explaining; put the message next to the field or in a summary

**Rules**

- Keep the button's width, or change it once and smoothly; a button that jumps under the pointer invites a second click.
- Disable the button while it works and say so to assistive technology: aria-busy, and the result in a live region.
- Swap label, spinner and check with a 150–200 ms crossfade and a move of a few pixels; nothing longer.
- Show the result for about 2 seconds, then return to the label or to the next state.
- On failure return to the label at once and show the error beside the form.
- Under reduced motion crossfade only; the spinner may still turn, because it reports progress.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-loading-success): Loading to success: the label drops away, the button closes around a spinner, then opens with a check and the word Sent

**Motion**

- Plays on: state
- Purpose: state
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: moderate
- Duration: 150–200 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: Label, spinner and result swap with a fade and do not move.

```css
.send { display: inline-grid; place-items: center; }
.send > * { grid-area: 1 / 1; transition: opacity 180ms ease-out, transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
.send > .busy, .send > .done { opacity: 0; transform: translateY(6px); }
.send[data-state='busy'] > .label, .send[data-state='done'] > .label { opacity: 0; transform: translateY(-6px); }
.send[data-state='busy'] > .busy, .send[data-state='done'] > .done { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .send > * { transition: opacity 180ms ease-out; transform: none !important; }
}
```

**Alternatives:** [Icon swap](#icon-swap), [Inline confirmation](#inline-confirmation), [Spinner](#spinner), [Optimistic update](#optimistic-update), [Toast](#toast)

**Sources:** Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits); Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback); Kim Flaherty 2024, *Indicators, Validations, and Notifications: Pick the Correct Communication Option* (Indicators, Validations, and Notifications)

### Sliding indicator

<a id="sliding-indicator"></a>

`sliding-indicator` · also called tab pill, animated tab highlight, moving underline

The highlight behind the selected tab or segment glides to the newly selected one instead of jumping.

**Use when**

- Tabs, a segmented control or a navigation bar with one highlight that marks the current item
- The items sit in one row or one column, so the highlight has a path to travel

**Avoid when**

- Selection is changed from the keyboard all day, as in a list of mail or files (move it at once)
- The items wrap onto several lines; the highlight would fly across the text
- Each tab loads a new page; the highlight would start over on arrival

**Rules**

- Move one highlight element with transform; do not fade one out and another in.
- 200–250 ms with an ease-in-out curve: it starts and ends on screen.
- The content below may crossfade; it does not slide unless the tabs are pages that swipe.
- The selected state is also carried by weight, color and aria-selected, never by the highlight alone.
- When selection changes with the arrow keys, follow at once.
- Under reduced motion the highlight jumps.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-tab-pill): Tab pill: the highlight stretches toward the new tab and then pulls its tail in
- [DesignBookmark Motion](https://designbookmark.com/motion#db-segmented-control): Segmented control: the highlight rides to the chosen segment
- [Kokonut UI](https://kokonutui.com/docs/navigation/smooth-tab): Smooth tab (not re-checked)

**Motion**

- Plays on: state
- Purpose: spatial
- Right up to: frequent use (tens of times a day: hover, moving through a list, a toggle used all the time)
- Intensity: subtle
- Duration: 200–250 ms, `cubic-bezier(0.65, 0, 0.35, 1)`
- Changes: `transform`
- Reduced motion: The highlight jumps to the new item.

```css
.tabs { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; }
.tabs .pill { position: absolute; inset-block: 0; left: 0; width: calc(100% / var(--count, 3)); transition: transform 220ms cubic-bezier(0.65, 0, 0.35, 1); }
.tabs:has([role='tab']:nth-of-type(2)[aria-selected='true']) .pill { transform: translateX(100%); }
.tabs:has([role='tab']:nth-of-type(3)[aria-selected='true']) .pill { transform: translateX(200%); }
@media (prefers-reduced-motion: reduce) {
  .tabs .pill { transition: none; }
}
```

**Alternatives:** [Instant change](#instant-change), [Crossfade](#crossfade)

**Sources:** Page Laubheimer 2020, *The Role of Animation and Motion in UX* (The Role of Animation and Motion in UX); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); Emil Kowalski, *You Don't Need Animations* (Frequency of use)

### Crossfade

<a id="crossfade"></a>

`crossfade` · also called fade through, dissolve

The old content fades out while the new content fades in, in the same place.

**Use when**

- Content is replaced in place and both versions occupy the same box: a tab panel, a picture, a label
- A hard cut makes people miss that something changed

**Avoid when**

- The two versions differ in size, so the box jumps under the fade (animate the size too, or cut)
- The switch is made from the keyboard all the time
- There is a place to show: where a panel came from or went to

**Rules**

- 150–200 ms in total; longer reads as lag.
- Change opacity only, and keep both versions in the same grid cell so the layout does not move.
- Fade the old version out faster than the new one comes in, so both are never readable at once.
- Take the old content out of the tab order and the accessibility tree as soon as it starts to fade.
- A short fade is not movement: it may stay under reduced motion.

**Seen in**

- [Material Design 3](https://m3.material.io/styles/motion/transitions/transition-patterns): Transitions: between top-level destinations the outgoing screen fades out before the incoming one fades in (not re-checked)
- [Microsoft Fluent 2](https://fluent2.microsoft.design/motion): Motion: top-level transitions (not re-checked)

**Motion**

- Plays on: state
- Purpose: continuity
- Right up to: frequent use (tens of times a day: hover, moving through a list, a toggle used all the time)
- Intensity: subtle
- Duration: 150–200 ms, `ease-out`
- Changes: `opacity`
- Reduced motion: Stays as it is: a short fade is not movement.

```css
.panels { display: grid; }
.panels > * { grid-area: 1 / 1; opacity: 0; visibility: hidden; transition: opacity 100ms ease-out, visibility 0s 100ms; }
.panels > .is-current { opacity: 1; visibility: visible; transition: opacity 180ms ease-out; }
```

**Alternatives:** [Instant change](#instant-change), [Sliding indicator](#sliding-indicator), [Fade in](#fade-in)

**Sources:** Google, *Material Design 3* (Motion: transitions); Microsoft, *Fluent 2 Design System* (Motion); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics)

### Fade in

<a id="fade-in"></a>

`fade-in` · also called fade, opacity transition

Something appears by going from transparent to opaque, without moving.

**Use when**

- A small element appears near where the person is looking: a tooltip, a hint, an inline message
- Movement would be too much for how often it appears
- Reduced motion is asked for and an entrance still needs a bridge

**Avoid when**

- The element comes from somewhere worth showing: a menu from its button, a drawer from an edge
- It appears on a keyboard shortcut used all day

**Rules**

- 100–200 ms with an ease-out curve.
- Fade out faster than in, or cut on the way out.
- Do not delay it: the fade begins with the action.
- Opacity is the only property that changes.
- @starting-style gives an entrance to an element that was just added or just shown; where it is not supported the element simply appears.

**Seen in**

- [IBM Carbon](https://carbondesignsystem.com/elements/motion/overview/): Motion: fades are micro-interactions and get the 110 ms duration token

**Motion**

- Plays on: open, enter
- Purpose: continuity
- Right up to: frequent use (tens of times a day: hover, moving through a list, a toggle used all the time)
- Intensity: subtle
- Duration: 100–200 ms, `ease-out`
- Changes: `opacity`
- Reduced motion: Stays as it is: a short fade is not movement.

```css
.tip { transition: opacity 150ms ease-out; }
@starting-style {
  .tip { opacity: 0; }
}
```

**Alternatives:** [Instant change](#instant-change), [Grow from the trigger](#origin-scale), [Rise in](#rise-in), [Crossfade](#crossfade)

**Sources:** IBM, *Carbon Design System* (Motion); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); MDN contributors, *@starting-style* (@starting-style)

### Grow from the trigger

<a id="origin-scale"></a>

`origin-scale` · also called origin-aware animation, pop in, scale in

A menu, popover or tooltip grows out of the control that opened it while it fades in.

**Use when**

- A small overlay opens from a button, field or icon: a dropdown menu, a popover, a select, a tooltip
- Showing where it came from helps people find the way back

**Avoid when**

- The overlay is centered on the screen, such as a dialog: it has no origin, so it fades and grows from its own center
- It opens on a keyboard shortcut used constantly
- It is a tooltip shown right after another one of the same group (show it at once)

**Rules**

- Set transform-origin to the side of the overlay that touches its trigger, not to the center.
- Start from a scale of 0.95–0.97 and opacity 0; never from 0.
- 125–200 ms with an ease-out curve for small popovers, up to 250 ms for menus and selects.
- Close faster than it opens, or at once.
- Under reduced motion fade only.

**Seen in**

- [Emil Kowalski](https://emilkowal.ski/ui/7-practical-animation-tips): 7 Practical Animation Tips: a popover that grows from the button that opened it, next to one that grows from its center
- [DesignBookmark Motion](https://designbookmark.com/motion#db-morph-tooltip): Morph tooltip: the first hover pops the tooltip in at its tool

**Motion**

- Plays on: open
- Purpose: spatial
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: subtle
- Duration: 125–250 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: The overlay fades in and does not grow.

```css
.menu { transform-origin: top left; transition: opacity 150ms ease-out, transform 150ms cubic-bezier(0.22, 1, 0.36, 1); }
@starting-style {
  .menu { opacity: 0; transform: scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .menu { transition: opacity 150ms ease-out; }
  @starting-style {
    .menu { transform: none; }
  }
}
```

**Alternatives:** [Instant change](#instant-change), [Fade in](#fade-in), [Slide in from the edge](#slide-in-panel)

**Sources:** Emil Kowalski, *7 Practical Animation Tips* (Make your animations origin-aware); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); Google, *Material Design 3* (Motion: easing and duration)

### Slide in from the edge

<a id="slide-in-panel"></a>

`slide-in-panel` · also called drawer transition, sheet transition, toast entrance

A drawer, sheet or toast slides in from the edge it belongs to and leaves through the same edge.

**Use when**

- A panel belongs to an edge of the window: a side sheet, a navigation drawer, a bottom sheet
- A toast or notification arrives at the corner where toasts stack

**Avoid when**

- The surface is centered (fade it, and grow it from its center)
- The panel is toggled all the time, like a sidebar collapsed with a shortcut (resize it at once)

**Rules**

- Enter and leave through the same edge; the direction tells people where it lives and how to dismiss it.
- 200–300 ms for sheets on desktop, up to 500 ms for full-height sheets on phones; ease-out on the way in, a little faster on the way out.
- Move with transform, not with left, right or width.
- Dim the page behind a modal sheet with a fade of the same duration.
- Move focus into the panel when it has arrived, and back to the trigger when it has left.
- Under reduced motion fade it in place.

**Seen in**

- [Nielsen Norman Group](https://www.nngroup.com/articles/animation-purpose-ux/): The Role of Animation and Motion in UX: a navigation menu that slides over the page when the menu icon is tapped
- [IBM Carbon](https://carbondesignsystem.com/elements/motion/overview/): Motion: toasts and system communication get the 240 ms duration token

**Motion**

- Plays on: open, enter
- Purpose: spatial
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: moderate
- Duration: 200–500 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `transform`
- Reduced motion: The panel fades in where it will stand.

```css
.sheet { transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1); }
@starting-style {
  .sheet { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .sheet { transition: opacity 150ms ease-out; }
  @starting-style {
    .sheet { transform: none; opacity: 0; }
  }
}
```

**Alternatives:** [Instant change](#instant-change), [Fade in](#fade-in), [Grow from the trigger](#origin-scale)

**Sources:** Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback); Emil Kowalski, *You Don't Need Animations* (Purposeful animations); IBM, *Carbon Design System* (Motion); Google, *Material Design 3* (Side sheets)

### Expand in place

<a id="expand-height"></a>

`expand-height` · also called accordion animation, height transition, collapse

A section opens by growing to the height of its content, pushing what is below it down smoothly.

**Use when**

- An accordion, an FAQ answer, a details block or "Show more" opens in place
- What is below would otherwise jump, and people would lose their place

**Avoid when**

- The content is very tall; a long travel is slow and the eye cannot follow it (open at once and keep the heading in view)
- Many sections are opened in a row from the keyboard

**Rules**

- Animate between zero and the content's own height: grid-template-rows from 0fr to 1fr, or, on a native details element, interpolate-size with ::details-content where the browser supports them (elsewhere it opens at once). Never animate to a guessed max-height.
- 200–300 ms with an ease-out curve; fade the content in over the same time.
- Close a little faster than it opens.
- Turn the chevron, or change plus to minus, in the same time, as one movement.
- The heading stays where it is; only what is below it moves.
- Under reduced motion open at once; the content may fade in.

**Seen in**

- [Chrome for Developers](https://developer.chrome.com/docs/css-ui/animate-to-height-auto): Animate to height: auto: transitions between a fixed length and the content's own size
- [DesignBookmark Motion](https://designbookmark.com/motion#db-expand-card): Expand card: the chosen row grows to its full height while the others give way

**Motion**

- Plays on: open
- Purpose: continuity
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: subtle
- Duration: 200–300 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `grid-template-rows`, `block-size`, `opacity`
- Reduced motion: The section opens at once; its content fades in.

```css
.panel { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease-out; }
.panel > * { overflow: hidden; min-height: 0; }
.is-open > .panel { grid-template-rows: 1fr; opacity: 1; }
@supports (interpolate-size: allow-keywords) {
  :root { interpolate-size: allow-keywords; }
  details::details-content { block-size: 0; overflow: clip; opacity: 0; transition: block-size 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease-out, content-visibility 240ms allow-discrete; }
  details[open]::details-content { block-size: auto; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .panel { transition: opacity 150ms ease-out; }
  details::details-content { transition: opacity 150ms ease-out; }
}
```

**Alternatives:** [Instant change](#instant-change), [Fade in](#fade-in)

**Sources:** Bramus 2024, *Animate to height: auto; (and other intrinsic sizing keywords) in CSS* (Animate to height: auto); IBM, *Carbon Design System* (Motion); Page Laubheimer 2020, *The Role of Animation and Motion in UX* (The Role of Animation and Motion in UX)

### Rise in

<a id="rise-in"></a>

`rise-in` · also called fade up, slide up and fade

An element appears by fading in while it moves up a few pixels into its place.

**Use when**

- A new item joins the page: a toast, a row added to a list, a message
- A section or card appears on a page that people do not open all day

**Avoid when**

- Lists that update by themselves many times a minute
- The element came from a particular place (grow it from its trigger, or slide it from its edge)
- Text that people are already reading would move

**Rules**

- Travel 8–16 px; more reads as a slide and takes attention.
- 200–300 ms with an ease-out curve.
- Animate opacity and transform only, so nothing around it is laid out again.
- A new item in a list: make room first or at the same time, so its neighbours do not jump after the entrance.
- Under reduced motion fade in place.

**Seen in**

- [Nielsen Norman Group](https://www.nngroup.com/articles/animation-purpose-ux/): The Role of Animation and Motion in UX: a shopping list in which the field for the next item fades in and slides into place
- [DesignBookmark Motion](https://designbookmark.com/motion#db-dynamic-menu): Dynamic menu: the links rise in when the menu opens

**Motion**

- Plays on: enter
- Purpose: continuity
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: subtle
- Duration: 200–300 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: The element fades in where it stands.

```css
.item { transition: opacity 240ms ease-out, transform 240ms cubic-bezier(0.22, 1, 0.36, 1); }
@starting-style {
  .item { opacity: 0; transform: translateY(12px); }
}
@media (prefers-reduced-motion: reduce) {
  .item { transition: opacity 240ms ease-out; }
  @starting-style {
    .item { transform: none; }
  }
}
```

**Alternatives:** [Instant change](#instant-change), [Fade in](#fade-in), [Staggered entrance](#stagger-in), [Slide in from the edge](#slide-in-panel)

**Sources:** Page Laubheimer 2020, *The Role of Animation and Motion in UX* (Motion for Feedback); Page Laubheimer 2020, *Executing UX Animations: Duration and Motion Characteristics* (Executing UX Animations: Duration and Motion Characteristics); Kayce Basques, *How to create high-performance CSS animations* (How to create high-performance CSS animations); MDN contributors, *@starting-style* (@starting-style)

### Staggered entrance

<a id="stagger-in"></a>

`stagger-in` · also called stagger, cascade, sequenced entrance

The items of a group appear one after another with a short delay between them, as a cascade.

**Use when**

- A group of like items appears together on a page seen now and then: the cards of a landing page, the links of an opened menu
- The order of appearance should lead the eye from the first item to the last

**Avoid when**

- Pages opened many times a day; the wait repeats every time
- Long lists: the last item would arrive late
- Items that people want to click at once; nothing may be unclickable while it waits

**Rules**

- 30–80 ms between items and no more than about 500 ms from the first to the last; stop adding delay after the first six to eight items.
- Every item uses the same short entrance: a fade and a rise of 8–12 px in 200–300 ms.
- One cascade per view; several at once cancel each other.
- Run it once, when the group first appears, not on every redraw or when it scrolls back into view.
- The items are in the page and can be focused from the start; only their appearance waits.
- Under reduced motion show all items at once, with a fade at most.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-sidebar-collapse): Sidebar collapse: when the sidebar opens, each label starts a little later down the list, so the names read in like a cascade
- [DesignBookmark Motion](https://designbookmark.com/motion#db-dynamic-menu): Dynamic menu: the links rise in with a short stagger

**Motion**

- Plays on: enter
- Purpose: attention
- Right up to: rare use (rarely or once: a first visit, a landing page, an empty state, a success moment)
- Intensity: moderate
- Duration: 200–300 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: All items are shown at once.

```css
.group > * { animation: rise 260ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--i, 0) * 50ms); }
.group > :nth-child(2) { --i: 1; }
.group > :nth-child(3) { --i: 2; }
.group > :nth-child(4) { --i: 3; }
.group > :nth-child(n + 5) { --i: 4; }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } }
@media (prefers-reduced-motion: reduce) {
  .group > * { animation: none; }
}
```

**Alternatives:** [Instant change](#instant-change), [Rise in](#rise-in), [Reveal on scroll](#scroll-reveal)

**Sources:** Frank Thomas 1981, *The Illusion of Life: Disney Animation* (The Principles of Animation); IBM, *Carbon Design System* (Motion: choreography); Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension)

### Reveal on scroll

<a id="scroll-reveal"></a>

`scroll-reveal` · also called scroll animation, appear on scroll

Sections fade and rise into place as they are scrolled into view.

**Use when**

- A long marketing or story page that is read once, from top to bottom
- The reveal paces the story: one point per screen

**Avoid when**

- Product screens, documentation and anything that people scan or search
- The page is visited again and again
- Parallax or taking over the scroll would be needed to make it work

**Rules**

- Reveal each section once; do not hide it again when it leaves the screen.
- A short travel (12–24 px) and a fade, finished by the time the section is well into view; reading must never wait for scrolling.
- The content is in the document from the start and readable without the effect: where scroll-driven animation is not supported, or reduced motion is asked for, it is simply there.
- No parallax and no scroll-jacking: the page scrolls at the speed of the person's hand.
- At most one reveal per section, not one per paragraph.

**Seen in**

- Apple: Product pages: sections fade into place as the page is scrolled (not re-checked)

**Motion**

- Plays on: scroll
- Purpose: attention
- Right up to: rare use (rarely or once: a first visit, a landing page, an empty state, a success moment)
- Intensity: moderate
- Changes: `opacity`, `transform`
- Reduced motion: Every section is simply there.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(20px); } }
```

**Alternatives:** [Instant change](#instant-change), [Staggered entrance](#stagger-in), [Rise in](#rise-in)

**Sources:** W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.3.3 Animation from Interactions); Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension); MDN contributors, *animation-timeline: view()* (animation-timeline: view())

### Attention pulse

<a id="attention-pulse"></a>

`attention-pulse` · also called beacon, hotspot, pulsing dot

A ring around a small dot pulses a few times to draw the eye to something new.

**Use when**

- Something changed outside the person's focus and they should notice it once: a new feature, a step that is waiting for them
- A static badge would be missed

**Avoid when**

- More than one thing would pulse on the same screen
- The thing is not new any more; a pulse that never stops is noise
- Errors and warnings, which need words

**Rules**

- Pulse two or three times, then rest as a still dot; anything that moves for more than five seconds needs a way to stop it.
- Animate the scale and opacity of a ring around a still dot, so the marker itself stays readable.
- One pulsing element per view.
- The news is also there as text: a label, a badge with a count, or an accessible name.
- Under reduced motion show the still dot only.

**Seen in**

- Intercom: Product tours: a pulsing hotspot marks the element that a tip belongs to (not re-checked)

**Motion**

- Plays on: ambient
- Purpose: attention
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: moderate
- Duration: 1200–1800 ms, `ease-out`
- Changes: `transform`, `opacity`
- Reduced motion: A still dot.

```css
.dot { position: relative; }
.dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; opacity: 0; animation: pulse 1.6s ease-out 3; }
@keyframes pulse { from { transform: scale(0.6); opacity: 0.8; } to { transform: scale(1.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .dot::after { animation: none; }
}
```

**Alternatives:** [Status badge](#status-badge), [Badge counter](#badge-counter), [Coach mark](#coach-mark)

**Sources:** Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension); W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.2.2 Pause, Stop, Hide)

### Rotating words

<a id="rotating-words"></a>

`rotating-words` · also called word roll, text rotator

One word of a headline is replaced by the next of a short list, one after another.

**Use when**

- A landing-page headline has to name several audiences or uses, and one sentence fits them all
- The page is visited rarely and the headline is its main message

**Avoid when**

- The headline must be understood at a glance: the word on screen may be the wrong one when people look
- Product screens
- The words differ much in length and the line would reflow

**Rules**

- Three to five words; each stays readable for at least two seconds.
- Reserve the width of the longest word, so the rest of the line never moves.
- Stop after one round and rest on the strongest word; it also pauses on hover and on keyboard focus, and movement that runs for more than five seconds needs a way to stop it.
- Every word is in the page as text for search engines and assistive technology; the rotation is decoration.
- Under reduced motion show the strongest word, still.

**Seen in**

- [DesignBookmark Motion](https://designbookmark.com/motion#db-word-roll): Word roll: the last word of the line rolls up and out while the next one rolls in from below
- [Kokonut UI](https://kokonutui.com/docs/texts/dynamic-text): Dynamic text (not re-checked)

**Motion**

- Plays on: ambient
- Purpose: delight
- Right up to: rare use (rarely or once: a first visit, a landing page, an empty state, a success moment)
- Intensity: expressive
- Duration: 2000–3000 ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Changes: `opacity`, `transform`
- Reduced motion: The strongest word, still.

```css
.words { display: inline-grid; overflow: hidden; vertical-align: bottom; }
.words > * { grid-area: 1 / 1; opacity: 0; animation: word-pass 2.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
.words > :nth-child(2) { animation-delay: 2.4s; }
.words > :last-child { animation-name: word-stay; animation-delay: 4.8s; }
.words:hover > *, .words:focus-within > * { animation-play-state: paused; }
@keyframes word-pass {
  0% { opacity: 0; transform: translateY(60%); }
  12%, 88% { opacity: 1; transform: none; }
  100% { opacity: 0; transform: translateY(-60%); }
}
@keyframes word-stay { from { opacity: 0; transform: translateY(60%); } 12%, to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .words > * { animation: none; }
  .words > :last-child { opacity: 1; }
}
```

**Alternatives:** [Instant change](#instant-change), [Marquee](#marquee)

**Sources:** W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.2.2 Pause, Stop, Hide); IBM, *Carbon Design System* (Motion: productive and expressive motion); Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension)

### Marquee

<a id="marquee"></a>

`marquee` · also called logo ticker, infinite scroller

A row of logos, quotes or tags moves sideways in a continuous loop.

**Use when**

- A landing page shows more logos or short quotes than fit in one row, and none is more important than the others
- The strip is decoration that says "many", not content to be read

**Avoid when**

- People need to read, compare or click an item (use a grid, or a carousel with controls)
- The row fits without moving
- Product screens, and pages with other movement near it

**Rules**

- Move slowly and evenly, about 30–60 px per second, with the list repeated once so that the loop has no seam.
- Pause on hover and on keyboard focus, and give it a visible pause control: it runs for more than five seconds.
- Fade the two ends into the background, so items do not pop in at the edge.
- Hide the repeated copy from assistive technology and from the tab order.
- Under reduced motion show a still row that wraps.

**Seen in**

- [Magic UI](https://magicui.design/docs/components/marquee): Marquee: rows of review cards that scroll in a loop and pause on hover

**Motion**

- Plays on: ambient
- Purpose: delight
- Right up to: rare use (rarely or once: a first visit, a landing page, an empty state, a success moment)
- Intensity: expressive
- Duration: 20000–40000 ms, `linear`
- Changes: `transform`
- Reduced motion: A still row that wraps.

```css
.strip { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.strip .track { display: flex; gap: 48px; width: max-content; animation: strip 30s linear infinite; }
.strip:hover .track, .strip:focus-within .track { animation-play-state: paused; }
@keyframes strip { to { transform: translateX(calc(-50% - 24px)); } }
@media (prefers-reduced-motion: reduce) {
  .strip .track { animation: none; flex-wrap: wrap; width: auto; }
}
```

**Alternatives:** [Instant change](#instant-change), [Rotating words](#rotating-words), [Carousel](#carousel), [Testimonial](#testimonial)

**Sources:** W3C 2023, *Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents* (SC 2.2.2 Pause, Stop, Hide); Aurora Harley 2014, *Animation for Attention and Comprehension* (Animation for Attention and Comprehension)

### Page crossfade

<a id="page-crossfade"></a>

`page-crossfade` · also called view transition, cross-document transition

Going from one page to the next, the old page fades into the new one instead of being replaced in a flash.

**Use when**

- A site of separate pages where navigation should feel continuous: marketing sites, documentation, catalogs
- Header and navigation are the same on both pages, so only the content appears to change

**Avoid when**

- Pages take long to load; a fade cannot hide a wait and makes it feel longer
- Navigation is constant and done from the keyboard, as in a mail client or an editor

**Rules**

- 150–250 ms: the browser's default crossfade or shorter. Do not slide whole pages on desktop.
- Opt in on both pages with @view-transition { navigation: auto }; browsers without support navigate as before.
- Parts that stay, such as the header or a sidebar, get their own view-transition-name so that they do not fade with the content.
- Never hold the navigation back for the effect: the transition starts when the new page can be drawn.
- Under reduced motion switch it off.

**Seen in**

- [Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document): Cross-document view transitions: two pages that opt in with the @view-transition rule

**Motion**

- Plays on: navigate
- Purpose: continuity
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: subtle
- Duration: 150–250 ms, `ease`
- Changes: `opacity`
- Reduced motion: No transition: the page changes at once.

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
}
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 200ms; }
.site-header { view-transition-name: site-header; }
```

**Alternatives:** [Instant change](#instant-change), [Shared element](#shared-element-morph)

**Sources:** Chrome for Developers, *Cross-document view transitions for multi-page applications* (Cross-document view transitions for multi-page applications); Page Laubheimer 2020, *The Role of Animation and Motion in UX* (The Role of Animation and Motion in UX); Jakob Nielsen 1993, *Response Time Limits* (Response Time Limits)

### Shared element

<a id="shared-element-morph"></a>

`shared-element-morph` · also called shared element transition, container transform, hero animation

An element that is on both pages, such as a thumbnail and its large picture, travels and resizes from its old place to its new one during navigation.

**Use when**

- A list or grid opens into a detail page, and one visible element is the same thing on both: a picture, a card, a title
- People go back and forth between list and detail and should keep their place

**Avoid when**

- The two elements differ so much in shape or content that the morph distorts them
- More than one or two elements would travel at once
- Details are opened all the time from the keyboard

**Rules**

- Give the element the same view-transition-name on both pages, and give that name to one element per page only: in a list, the item being opened.
- 250–400 ms with an ease-in-out curve: it starts and ends on screen and travels far.
- Everything else crossfades underneath; only the shared element moves.
- The same morph runs backwards on Back.
- Under reduced motion the pages change at once or crossfade.

**Seen in**

- [Material Design 3](https://m3.material.io/styles/motion/transitions/transition-patterns): Transitions: container transform, in which a card grows into the screen it opens (not re-checked)
- Apple App Store: Today: a card grows into the article it opens (not re-checked)

**Motion**

- Plays on: navigate
- Purpose: spatial
- Right up to: occasional use (now and then: dialogs, drawers, toasts, settings)
- Intensity: moderate
- Duration: 250–400 ms, `cubic-bezier(0.65, 0, 0.35, 1)`
- Changes: `transform`, `width`, `height`
- Reduced motion: No morph: the page changes at once.

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
  .cover { view-transition-name: cover; }
  ::view-transition-group(cover) { animation-duration: 320ms; animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
}
```

**Alternatives:** [Instant change](#instant-change), [Page crossfade](#page-crossfade)

**Sources:** Google, *Material Design 3* (Motion: transitions); Microsoft, *Fluent 2 Design System* (Motion); Chrome for Developers, *Cross-document view transitions for multi-page applications* (Cross-document view transitions for multi-page applications)

## References

- Adam Silver. *Form Design Patterns*. Smashing Magazine, 2018.
- Adam Silver. [The problem with float labels and what to do instead](https://adamsilver.io/blog/the-problem-with-float-labels-and-what-to-do-instead/). Adam Silver, 2017.
- Adam Silver. [The problem with toast messages and what to do instead](https://adamsilver.io/blog/the-problem-with-toast-messages-and-what-to-do-instead/). Adam Silver, 2020.
- Adam Silver. [The problem with tooltips and what to do instead](https://adamsilver.io/blog/the-problem-with-tooltips-and-what-to-do-instead/). Adam Silver, 2019.
- Adam Silver. [The problem with disabled buttons and what to do instead](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/). Adam Silver, 2023.
- Adam Silver. [The problem with live validation and what to do instead](https://adamsilver.io/blog/the-problem-with-live-validation-and-what-to-do-instead/). Adam Silver, 2017.
- Adam Wathan, Steve Schoger. *Refactoring UI*. Refactoring UI, 2018.
- Alan Blackwood. [Product Image UX: Always Use Thumbnails](https://baymard.com/research-articles/always-use-thumbnails-additional-images). Baymard Institute, 2020.
- Alan Cooper, Robert Reimann, David Cronin, Christopher Noessel. *About Face: The Essentials of Interaction Design*. 4th ed., Wiley, 2014.
- Alita Kendrick. [Toggle-Switch Guidelines](https://www.nngroup.com/articles/toggle-switch-guidelines/). Nielsen Norman Group, 2018.
- Alita Kendrick. [Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/). Nielsen Norman Group, 2019.
- Angie Li. [Date-Input Form Fields: UX Design Guidelines](https://www.nngroup.com/articles/date-input/). Nielsen Norman Group, 2017.
- Angie Li, Jakob Nielsen. [Mega Menus Work Well for Site Navigation](https://www.nngroup.com/articles/mega-menus-work-well/). Nielsen Norman Group, 2017.
- Anna Kaley. [Listboxes vs. Dropdown Lists](https://www.nngroup.com/articles/listbox-dropdown/). Nielsen Norman Group, 2020.
- Anna Kaley. [Contextual Menus: Delivering Relevant Tools for Tasks](https://www.nngroup.com/articles/contextual-menus/). Nielsen Norman Group, 2019.
- Apple. [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines). Apple.
- Atlassian. [Atlassian Design System](https://atlassian.design/). Atlassian.
- Aurora Harley. [Slider Design: Rules of Thumb](https://www.nngroup.com/articles/gui-slider-controls/). Nielsen Norman Group, 2015.
- Aurora Harley. [Instructional Overlays and Coach Marks for Mobile Apps](https://www.nngroup.com/articles/mobile-instructional-overlay/). Nielsen Norman Group, 2014.
- Aurora Harley. [Icon Usability](https://www.nngroup.com/articles/icon-usability/). Nielsen Norman Group, 2014.
- Aurora Harley. [Animation for Attention and Comprehension](https://www.nngroup.com/articles/animation-usability/). Nielsen Norman Group, 2014.
- Aza Raskin. [Never Use a Warning When you Mean Undo](https://alistapart.com/article/neveruseawarning/). A List Apart, 2007.
- Bill Scott, Theresa Neil. *Designing Web Interfaces: Principles and Patterns for Rich Interactions*. O'Reilly Media, 2009.
- Bramus. [Animate to height: auto; (and other intrinsic sizing keywords) in CSS](https://developer.chrome.com/docs/css-ui/animate-to-height-auto). Chrome for Developers, 2024.
- Chrome for Developers. [Cross-document view transitions for multi-page applications](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document). Chrome for Developers.
- Dan Saffer. *Microinteractions: Designing with Details*. O'Reilly Media, 2013.
- Denys Mishunov. [True Lies Of Optimistic User Interfaces](https://www.smashingmagazine.com/2016/11/true-lies-of-optimistic-user-interfaces/). Smashing Magazine, 2016.
- Don Norman. *The Design of Everyday Things*. Revised and expanded ed., Basic Books, 2013.
- Edward Scott. [Usability Testing of Inline Form Validation](https://baymard.com/research-articles/inline-form-validation). Baymard Institute, 2024.
- Edward Scott. [E-Commerce Checkouts Need to Mark Both Required Fields and Optional Fields Explicitly (Only 14% Do So)](https://baymard.com/research-articles/required-optional-form-fields). Baymard Institute, 2018.
- Edward Scott. [Avoid Extensive Multicolumn Layouts](https://baymard.com/research-articles/avoid-multi-column-forms). Baymard Institute, 2023.
- Edward Scott. [10 UX Requirements for Homepage Carousels](https://baymard.com/research-articles/homepage-carousel). Baymard Institute, 2019.
- Edward Scott. [9 UX Best Practice Design Patterns for Autocomplete Suggestions (Only 19% Get Everything Right)](https://baymard.com/research-articles/autocomplete-design). Baymard Institute, 2022.
- Edward Scott. [4 Ways to Optimize the Comparison Feature for Scanning](https://baymard.com/research-articles/user-friendly-comparison-tools). Baymard Institute, 2022.
- Edward Scott. [Provide a Hover Delay of 300–500 MS for Hover-Based Drop-Down Menus (60% Don’t)](https://baymard.com/research-articles/dropdown-menu-flickering-issue). Baymard Institute, 2023.
- Edward Scott. [Use Buttons or Buttons Plus an Open Text Field for Updating Cart Quantity (61% Don’t)](https://baymard.com/research-articles/auto-update-users-quantity-changes). Baymard Institute, 2022.
- Eiji Kitamura. [SMS OTP form best practices](https://web.dev/articles/sms-otp-form). web.dev, 2020.
- Emil Kowalski. [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations).
- Emil Kowalski. [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips).
- Emil Kowalski. [Great Animations](https://emilkowal.ski/ui/great-animations).
- Ethan Marcotte. *Responsive Web Design*. 2nd ed., A Book Apart, 2014.
- Evan Sunwall. [Tabs, Used Right](https://www.nngroup.com/articles/tabs-used-right/). Nielsen Norman Group, 2024.
- Frank Thomas, Ollie Johnston. *The Illusion of Life: Disney Animation*. Abbeville Press, 1981.
- GitHub. [Primer Design System](https://primer.style/). GitHub.
- GitLab. [Pajamas Design System](https://design.gitlab.com/). GitLab.
- Google. [Material Design 3](https://m3.material.io/). Google.
- Government Digital Service. [GOV.UK Design System](https://design-system.service.gov.uk/). Government Digital Service.
- Heydon Pickering. *Inclusive Components*. Smashing Magazine, 2019.
- Heydon Pickering, Andy Bell. *Every Layout*. Heydon Pickering and Andy Bell, 2019.
- Hoa Loranger. [Back-to-Top Button Design Guidelines](https://www.nngroup.com/articles/back-to-top/). Nielsen Norman Group, 2017.
- Hoa Loranger. [Beyond Blue Links: Making Clickable Elements Recognizable](https://www.nngroup.com/articles/clickable-elements/). Nielsen Norman Group, 2015.
- Huei-Hsin Wang. [Accordions on Desktop: When and How to Use](https://www.nngroup.com/articles/accordions-on-desktop/). Nielsen Norman Group, 2023.
- Huei-Hsin Wang. [In-Page Links for Content Navigation](https://www.nngroup.com/articles/in-page-links-content-navigation/). Nielsen Norman Group, 2023.
- Huei-Hsin Wang. [Homepage Design: 5 Fundamental Principles](https://www.nngroup.com/articles/homepage-design-principles/). Nielsen Norman Group, 2024.
- Huei-Hsin Wang, Maddie Brown. [Table of Contents: The Ultimate Design Guide](https://www.nngroup.com/articles/table-of-contents/). Nielsen Norman Group, 2023.
- IBM. [Carbon Design System](https://carbondesignsystem.com/). IBM.
- Jakob Nielsen. [Checkboxes vs. Radio Buttons](https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/). Nielsen Norman Group, 2004.
- Jakob Nielsen. [Stop Password Masking](https://www.nngroup.com/articles/stop-password-masking/). Nielsen Norman Group, 2009.
- Jakob Nielsen. [Search: Visible and Simple](https://www.nngroup.com/articles/search-visible-and-simple/). Nielsen Norman Group, 2001.
- Jakob Nielsen. [Auto-Forwarding Carousels, Accordions Annoy Users & Reduce Visibility](https://www.nngroup.com/articles/auto-forwarding/). Nielsen Norman Group, 2013.
- Jakob Nielsen. [Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/). Nielsen Norman Group, 2018.
- Jakob Nielsen. [Response Time Limits](https://www.nngroup.com/articles/response-times-3-important-limits/). Nielsen Norman Group, 1993.
- Jakob Nielsen. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/). Nielsen Norman Group, 2006.
- Jakob Nielsen. [OK-Cancel or Cancel-OK? The Trouble With Buttons](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/). Nielsen Norman Group, 2008.
- Jakob Nielsen. [Command Links](https://www.nngroup.com/articles/command-links/). Nielsen Norman Group, 2007.
- Jakob Nielsen. [Users' Pagination Preferences and "View All"](https://www.nngroup.com/articles/item-list-view-all/). Nielsen Norman Group, 2013.
- Jakob Nielsen. [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/). Nielsen Norman Group, 1994.
- Jeff Johnson. *Designing with the Mind in Mind: Simple Guide to Understanding User Interface Design Guidelines*. 3rd ed., Morgan Kaufmann, 2020.
- Jen Cardello. [Social Proof in the User Experience](https://www.nngroup.com/articles/social-proof-ux/). Nielsen Norman Group, 2014.
- Jenifer Tidwell, Charles Brewer, Aynne Valencia. *Designing Interfaces: Patterns for Effective Interaction Design*. 3rd ed., O'Reilly Media, 2020.
- Jon Yablonski. *Laws of UX: Using Psychology to Design Better Products & Services*. 2nd ed., O'Reilly Media, 2024.
- Josh W. Comeau. [An Interactive Guide to CSS Transitions](https://www.joshwcomeau.com/animation/css-transitions/). 2021.
- Kara Pernice. [Carousel Usability: Effective UI for Content Overload](https://www.nngroup.com/articles/designing-effective-carousels/). Nielsen Norman Group, 2013.
- Kara Pernice. [F-Shaped Pattern of Reading: Misunderstood, But Still Relevant](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/). Nielsen Norman Group, 2017.
- Kara Pernice. [The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/). Nielsen Norman Group, 2019.
- Kara Pernice, Raluca Budiu. [Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/). Nielsen Norman Group, 2016.
- Kate Kaplan. [Designing Empty States in Complex Applications: 3 Guidelines](https://www.nngroup.com/articles/empty-state-interface-design/). Nielsen Norman Group, 2021.
- Kate Moran. [Site Search Suggestions](https://www.nngroup.com/articles/site-search-suggestions/). Nielsen Norman Group, 2018.
- Kate Moran. [Helpful Filter Categories and Values for Better UX](https://www.nngroup.com/articles/filter-categories-values/). Nielsen Norman Group, 2018.
- Kate Moran, Taylor Dykes. [Comparison Tables for Products, Services, and Features](https://www.nngroup.com/articles/comparison-tables/). Nielsen Norman Group, 2024.
- Kathryn Reeves. [Filtering UX: Display “Applied Filters” in an Overview](https://baymard.com/research-articles/how-to-design-applied-filters). Baymard Institute, 2020.
- Kathryn Whitenton. [Overuse of Overlays: How to Avoid Misusing Lightboxes](https://www.nngroup.com/articles/overuse-of-overlays/). Nielsen Norman Group, 2015.
- Katie Hempenius. [Best practices for cookie notices](https://web.dev/articles/cookie-notice-best-practices). web.dev, 2021.
- Katie Sherwin. [Placeholders in Form Fields Are Harmful](https://www.nngroup.com/articles/form-design-placeholders/). Nielsen Norman Group, 2014.
- Katie Sherwin. [Progress Indicators Make a Slow System Less Insufferable](https://www.nngroup.com/articles/progress-indicators/). Nielsen Norman Group, 2014.
- Kayce Basques, Rachel Andrew. [How to create high-performance CSS animations](https://web.dev/articles/animations-guide). web.dev.
- Kim Flaherty. [Indicators, Validations, and Notifications: Pick the Correct Communication Option](https://www.nngroup.com/articles/indicators-validations-notifications/). Nielsen Norman Group, 2024.
- Kim Flaherty. [The Anatomy of a List Entry](https://www.nngroup.com/articles/list-entries/). Nielsen Norman Group, 2016.
- Kim Flaherty. [Zigzag Image–Text Layouts Make Scanning Less Efficient](https://www.nngroup.com/articles/zigzag-page-layout/). Nielsen Norman Group, 2017.
- Lars Söderlund. [Drop-Down Usability: When You Should (and Shouldn't) Use Them](https://baymard.com/research-articles/drop-down-usability). Baymard Institute, 2018.
- Luke Wroblewski. *Web Form Design: Filling in the Blanks*. Rosenfeld Media, 2008.
- Luke Wroblewski. *Mobile First*. A Book Apart, 2011.
- Luke Wroblewski. [Inline Validation in Web Forms](https://alistapart.com/article/inline-validation-in-web-forms/). A List Apart, 2009.
- Luke Wroblewski. [Top, Right or Left Aligned Form Labels](https://www.lukew.com/ff/504/top-right-or-left-aligned-form-labels). LukeW Ideation + Design, 2007.
- Luke Wroblewski. [Dropdowns Should be the UI of Last Resort](https://www.lukew.com/ff/1950/dropdowns-should-be-the-ui-of-last-resort). LukeW Ideation + Design, 2015.
- Luke Wroblewski. [Mobile Design Details: Hide/Show Passwords](https://www.lukew.com/ff/1653/mobile-design-details-hide-show-passwords). LukeW Ideation + Design, 2012.
- Maria Rosala. [User Control and Freedom (Usability Heuristic #3)](https://www.nngroup.com/articles/user-control-and-freedom/). Nielsen Norman Group, 2020.
- MDN contributors. [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style). MDN Web Docs.
- MDN contributors. [animation-timeline: view()](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view). MDN Web Docs.
- Microsoft. [Fluent 2 Design System](https://fluent2.microsoft.design/). Microsoft.
- Microsoft. [Windows app design guidance](https://learn.microsoft.com/en-us/windows/apps/design/). Microsoft.
- Page Laubheimer. [Breadcrumbs: 11 Design Guidelines for Desktop and Mobile](https://www.nngroup.com/articles/breadcrumbs/). Nielsen Norman Group, 2018.
- Page Laubheimer. [Split Buttons: Definition](https://www.nngroup.com/articles/split-buttons/). Nielsen Norman Group, 2019.
- Page Laubheimer. [Bottom Sheets: Definition and UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/). Nielsen Norman Group, 2023.
- Page Laubheimer. [Cards: UI-Component Definition](https://www.nngroup.com/articles/cards-component/). Nielsen Norman Group, 2016.
- Page Laubheimer. [Sticky Headers: 5 Ways to Make Them Better](https://www.nngroup.com/articles/sticky-headers/). Nielsen Norman Group, 2021.
- Page Laubheimer. [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/). Nielsen Norman Group, 2022.
- Page Laubheimer. [Onboarding Tutorials vs. Contextual Help](https://www.nngroup.com/articles/onboarding-tutorials/). Nielsen Norman Group, 2023.
- Page Laubheimer. [Drag–and–Drop: How to Design for Ease of Use](https://www.nngroup.com/articles/drag-drop/). Nielsen Norman Group, 2020.
- Page Laubheimer. [Left-Side Vertical Navigation on Desktop: Scalable, Responsive, and Easy to Scan](https://www.nngroup.com/articles/vertical-nav/). Nielsen Norman Group, 2021.
- Page Laubheimer. [Local Navigation Is a Valuable Orientation and Wayfinding Aid](https://www.nngroup.com/articles/local-navigation/). Nielsen Norman Group, 2021.
- Page Laubheimer. [Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/). Nielsen Norman Group, 2017.
- Page Laubheimer. [Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/). Nielsen Norman Group, 2020.
- Page Laubheimer. [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/). Nielsen Norman Group, 2020.
- Rachel Krause. [10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/). Nielsen Norman Group, 2019.
- Raluca Budiu. [Marking Required Fields in Forms](https://www.nngroup.com/articles/required-fields/). Nielsen Norman Group, 2019.
- Raluca Budiu. [Wizards: Definition and Design Recommendations](https://www.nngroup.com/articles/wizards/). Nielsen Norman Group, 2017.
- Raluca Budiu. [Basic Patterns for Mobile Navigation](https://www.nngroup.com/articles/mobile-navigation-patterns/). Nielsen Norman Group, 2015.
- Raluca Budiu. [State-Switch Controls: The Case of the "Mute" Button](https://www.nngroup.com/articles/state-switch-buttons/). Nielsen Norman Group, 2020.
- Sam Dutton. [Sign-in form best practices](https://web.dev/articles/sign-in-form-best-practices). web.dev, 2020.
- Samhita Tankala. [Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/). Nielsen Norman Group, 2023.
- Samhita Tankala. [Cookie Permissions 101](https://www.nngroup.com/articles/cookie-permissions/). Nielsen Norman Group, 2023.
- Sarah Richards. [FAQs: why we don't have them](https://gds.blog.gov.uk/2013/07/25/faqs-why-we-dont-have-them/). Government Digital Service blog, 2013.
- Shopify. [Polaris](https://shopify.dev/docs/api/app-home/latest). Shopify.
- Sonia Sousa. [5 Proven UX Strategies For "No Results" Pages](https://baymard.com/research-articles/no-results-page). Baymard Institute, 2019.
- Steve Krug. *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability*. 3rd ed., New Riders, 2014.
- Steven Hoober, Eric Berkman. *Designing Mobile Interfaces*. O'Reilly Media, 2011.
- Susan Farrell. [FAQs Still Deliver Great Value](https://www.nngroup.com/articles/faqs-deliver-value/). Nielsen Norman Group, 2014.
- Therese Fessenden. [Modal & Nonmodal Dialogs: When (& When Not) to Use Them](https://www.nngroup.com/articles/modal-nonmodal-dialog/). Nielsen Norman Group, 2017.
- Therese Fessenden. [Web Page Footers 101: Design Patterns and When to Use Each](https://www.nngroup.com/articles/footers/). Nielsen Norman Group, 2019.
- Therese Fessenden. [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/). Nielsen Norman Group, 2018.
- Thomas Steiner. [prefers-reduced-motion: Sometimes less movement is more](https://web.dev/articles/prefers-reduced-motion). web.dev.
- Tim Neusesser. [Infinite Scrolling: When to Use It, When to Avoid It](https://www.nngroup.com/articles/infinite-scrolling-tips/). Nielsen Norman Group, 2022.
- U.S. General Services Administration. [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/). U.S. General Services Administration.
- Vitaly Friedman. [Designing Sticky Menus: UX Guidelines](https://www.smashingmagazine.com/2023/05/sticky-menus-ux-guidelines/). Smashing Magazine, 2023.
- Vitaly Friedman. [User-Friendly Mega-Dropdowns: When Hover Menus Fail](https://www.smashingmagazine.com/2021/05/frustrating-design-patterns-mega-dropdown-hover-menus/). Smashing Magazine, 2021.
- Vitaly Friedman. [Infinite Scroll UX Done Right: Guidelines and Best Practices](https://www.smashingmagazine.com/2022/03/designing-better-infinite-scroll/). Smashing Magazine, 2022.
- Vitaly Friedman. [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/). Smashing Magazine, 2022.
- Vitaly Friedman. [Designing The Perfect Feature Comparison Table](https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/). Smashing Magazine, 2017.
- Vitaly Friedman. [Designing The Perfect Date And Time Picker](https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/). Smashing Magazine, 2017.
- W3C. [Web Content Accessibility Guidelines (WCAG) 2.2, with Understanding documents](https://www.w3.org/WAI/WCAG22/Understanding/). W3C, 2023.
- W3C Web Accessibility Initiative. [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/). W3C Web Accessibility Initiative.
- W3C Web Accessibility Initiative. [Web Accessibility Tutorials](https://www.w3.org/WAI/tutorials/). W3C.
- Yuxuan (Tammy) Zhou. [Design Guidelines for Input Steppers](https://www.nngroup.com/articles/input-steppers/). Nielsen Norman Group, 2018.
