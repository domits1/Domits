# Code Conventions for Domits

## Table of Contents

<!-- TOC -->
- [Code Conventions for Domits](#code-conventions-for-domits)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Overview File naming](#overview-file-naming)
  - [Folder Structure](#folder-structure)
  - [Folder structure usage](#folder-structure-usage)
  - [Constants](#constants)
    - [Examples](#examples)
    - [Files with multiple words](#files-with-multiple-words)
  - [Setup instructions for a new feature](#setup-instructions-for-a-new-feature)
    - [Directory Structure Examples](#directory-structure-examples)
  - [Imports](#imports)
  - [Descriptive Naming Conventions](#descriptive-naming-conventions)
    - [Example](#example)
  - [Cascading Style Sheets (CSS)](#cascading-style-sheets-css)
  - [Conclusion](#conclusion)
  - [ESLINT and PRETTIER](#eslint-and-prettier)
  - [Conclusion](#conclusion-1)
<!-- TOC -->

## Introduction

Code conventions are essential for maintaining a consistent and readable codebase in any software project. This wiki
outlines the conventions to be followed in a Domits. The primary focus is on organizing folder structures, with an
emphasis on lowercase folder names and uppercase JavaScript file names.

## Overview File naming

| Type of file           | naming convention                       |
|------------------------|-----------------------------------------|
| Folders                | lowercase                               |
| Js classes/files       | PascalCase                              |
| html/css classes/files | kebab-case                              |
| Attributes             | camelCase                               |
| Methods                | camelCase                               |
| Constants              | UPPERCASE_WITH_UNDERSCORES_WHERE_NEEDED |

## Folder Structure

The project follows a standardized folder structure to enhance organization and maintainability. Key conventions
include:
Lowercase Folders: All folder names within the project should be in lowercase. This applies to both top-level and nested
folders.

In addition to the folder structure, specific conventions are applied to file names, especially JavaScript files:

Uppercase JavaScript Files: JavaScript files, especially those containing React components, should have uppercase
filenames. This convention improves visibility and distinguishes these files from other types of files.

## Folder structure usage

```
- web/ # Web-specific configuration and public files
    - src/
        - features/ # base folder (unless global or otherwise)
            - hostonboarding
                - pages/ # Page-level components (e.g., routes)
                - components/ # Reusable components (within this feature)
                - context/ # context for global state management
                - hooks/ # custom hooks
                - navigation/ # navigation setup or router
                - services/ # global API calls and business logic
                - store/ # state management
                - styles/
                - tests/
                - utils/ # Helper functions or utilities
                    - contants/ # Constant attributes
                    - api.js # API calls
                    - formatters.js # Formatting helpers
                - views/ # feature-level pages?
    - public/ # Static files for the web app
- src # Shared files
- app/ # App-specific configuration and public files

    - domits/
        - android/ # Android-specific native files
        - ios/ # Ios specific files
        - amplify/ # Amplify specific files
        - features/
```

## Constants

Constants are attributes that never change.
These are allways written in UPPERCASE_WITH_UNDERSCORES_WHERE_NEEDED.

### Examples

**Good**
export const MAX_USERS = 100;
export const API_URL = "https://example.com";

**Avoid**
export const maxUsers = 100;
export const apiUrl = "https://example.com";

---

### Files with multiple words

```
- src/
    - components/
        - contact/
            - ThisIsAnExample.js
            - thisisanexample.css
```

## Setup instructions for a new feature

When starting a new feature, it begins in the folder
web or app.

1. use a terminal from root to navigate to either web/src/feature or app/src/feature..

```
cd web
```

OR

```
cd app
```

2. Use the following code to create a base folder structure:

```
$folders = @("components", "context", "hooks", "navigation", "services", "store", "styles", "tests", "utils", "views")
$basePath = "src/features/NewFeatureName"

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path "$basePath/$folder" -Force
    New-Item -ItemType File -Path "$basePath/$folder/.gitkeep" -Force | Out-Null
}
```

3. ***Make sure you replace {NewFeatureName} !!!**

### Directory Structure Examples

```
└───src
├───components
│ ├───base
│ ├───home
│ ├───toast
│ └───ui
│ └───DigitsInputs
├───context
├───features
│ ├───hostdashboard
│ │ ├───components
│ │ ├───context
│ │ ├───hooks
│ ├───hostonboarding
│ │ ├───components
│ │ │ CheckBoxGroup.js
│ │ │ FeatureTable.js
│ │ │ TimeSelector.js
│ │ ├───constants
│ │ │ amenitiesData.js
│ │ ├───context
│ │ ├───hooks
│ │ │ StepGuard.js
│ │ ├───navigation
│ │ ├───pages
│ │ │ HostOnboarding.js
│ │ ├───services
│ │ │ hostonboardingApi.js
│ │ ├───stores
│ │ │ formStore.js
│ │ ├───styles
│ │ ├───tests
│ │ ├───utils
│ │ │ FetchUserId.js
│ │ │ generateAccomodationId.js
│ │ └───views
│ │ BoatTypeView.js
│ │ CamperTypeView.js
│ │ HouseTypeView.js
│ │ PhotoView.css
│ │ PropertyRateView.js
│ │ PropertyTypeView.js
│ │ SummaryView.js

---

└───app
├───android
│ ├───app
│ │ └───src
│ │ └───main
├───assets
│ └───fonts
├───ios
│ ├───Domits
│ ├───src
│ │ ├───components
│ │ │ └───utils
│ │ ├───config
│ │ ├───context
│ │ ├───features
│ │ │ ├───auth
│ │ │ │ ├───guestauth
│ │ │ │ │ ├───components
│ │ │ │ │ ├───context
│ │ │ │ │ ├───hooks
│ │ │ │ │ ├───navigation
│ │ │ │ │ ├───pages
│ │ │ │ │ ├───services
│ │ │ │ │ ├───store
│ │ │ │ │ ├───styles
│ │ │ │ │ ├───tests
│ │ │ │ │ ├───utils
│ │ │ │ │ └───views
│ │ │ │ └───hostauth
│ │ │ │ ├───components
│ │ │ │ ├───context
│ │ │ │ ├───hooks
│ │ │ │ ├───navigation
│ │ │ │ ├───pages
│ │ │ │ ├───services
│ │ │ │ ├───store
│ │ │ │ ├───styles
│ │ │ │ ├───tests
│ │ │ │ ├───utils
│ │ │ │ └───views
│ │ │ ├───header
│ │ │ ├───hooks
│ │ │ ├───images
│ │ │ ├───navigation
│ │ │ ├───pages
│ │ │ │ ├───about
│ │ │ │ │ ├───components
│ │ │ │ │ ├───context
│ │ │ │ │ ├───hooks
│ │ │ │ │ ├───navigation
│ │ │ │ │ ├───pages
│ │ │ │ │ ├───services
│ │ │ │ │ ├───store
│ │ │ │ │ ├───styles
│ │ │ │ │ ├───tests
│ │ │ │ │ ├───utils
│ │ │ │ │ └───views
│ │ ├───screens
│ │ │ ├───apphostonboarding
│ │ │ ├───bookingprocess
│ │ │ ├───chat
│ │ │ ├───GeneralUtils
│ │ │ ├───guestdashboard
│ │ │ ├───hostdashboard
│ │ │ ├───login
│ │ │ ├───message
│ │ │ │ └───Hooks
│ │ │ ├───oldHostonboarding
│ │ │ ├───pictures
│ │ │ │ ├───BoatTypes
│ │ │ │ └───Onboarding-icons
│ │ │ └───utils
│ │ ├───services
│ │ ├───store
│ │ ├───styles
│ │ ├───tests
└───────└───utils
```

## Imports

```
- External imports (e.g. React, PropTypes) first
- Internal imports (e.g. utils, components) second
- styles as last

// Good
import React from 'react';
import PropTypes from 'prop-types';

import MyComponent from '../MyComponent';
import utils from '../../utils';
import style.css from '../styles/style.css';

// Avoid
import utils from '../../utils';
import PropTypes from 'prop-types';
import React from 'react';
import MyComponent from '../MyComponent';
```

## Descriptive Naming Conventions

Descriptive and consistent naming is crucial for code readability. Follow these guidelines:

Descriptive Component Names: When naming React components, use clear and descriptive names that reflect their purpose or
functionality.

### Example

```
// Good
const Header = () => {
  // component logic
};

// Avoid
const Comp = () => {
  // unclear component logic
}; 
```

## Cascading Style Sheets (CSS)

Domits has a color preset to keep things consistent. --primary-color is our green color (mostly used for guest side) and
--secondary-color is used for the host side.

Use the global web/src/App.css to apply global constants in styling.

// Good

```
import domits-got-it-going.html
import domits-got-it-going.css

.domits-header {
  background-color: var(--domits-green);
}
``` 

// Avoid

``` 
import domitsGotItGoing.html
import domitsGotItGoing.css

.domitsHeader {
  background-color: var(--domits-green);
}

```

If you want to set a hover on a button for example please use the example below:

```

.menu-dropdown button:hover {
opacity: 90%;
}

```

## Conclusion

Adhering to these code conventions ensures a standardized and readable codebase, facilitating collaboration and
maintenance in the long run. Developers are encouraged to follow these guidelines consistently throughout the project.

Remember, code conventions are meant to be guidelines, and it's essential to maintain flexibility based on
project-specific needs.

------- needs to be added to the conventions

## ESLINT and PRETTIER

You can set up your IDE to automatically check
https://github.com/domits1/Domits/wiki/Setting-up-code-conventions-checks-(automatic-IDE)

```

## Conclusion

Adhering to these code conventions ensures a standardized and readable codebase, facilitating collaboration and
maintenance in the long run. Developers are encouraged to follow these guidelines consistently throughout the project.

Remember, code conventions are meant to be guidelines, and it's essential to maintain flexibility based on
project-specific needs.
