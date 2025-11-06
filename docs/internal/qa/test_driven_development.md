
#  Test-Driven-Development

**Introduction**
This document outlines the Test-Driven Development (TDD) approach used in our React project. TDD is a software development process that relies on the repetition of a very short development cycle: first the developer writes a failing automated test case that defines a desired improvement or new function, then the code is produced to pass that test, and finally the code is refactored to acceptable standards.



 ## Development Environment
 ### Tools and Technologies
* React: A JavaScript library for building user interfaces.
* Jest: A JavaScript testing framework used for writing unit tests in our project.

### TDD Process Overview
##
The Tdd cycle is implemented through three main steps:

Write a Failing Test: Start by writing a test that fails because it describes a feature or function not yet implemented.
Make the Test Pass: Write the minimum amount of code necessary to make the test pass.
Refactor: Optimize and simplify your code without changing functionality. This makes for a cleaner and more maintainable code base.
Repeat: Repeat this cycle for each new feature or bug fix.

***
### Test Specifications
Unit Testing with Jest
Test Structure
describe block: Used to group together similar tests.
it block: Describes a single test case.
Example: Testing a button component:


```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button component', () => {
  it('renders the button with initial text', () => {
    render(<Button />);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('changes text after click', () => {
    render(<Button />);
    userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('Clicked');
  });
});
```

**In this example:**

The first test ensures the button renders with initial text.
The second test checks if the button text changes on user interaction.

### *Best Practices*
##
Incremental Development: Focus on small increments for better test coverage and easier problem-solving.
Isolation: Each test should be independent of others; setup and teardown methods can help isolate tests.
Mocking: Use mocks to simulate behavior of complex dependencies like API calls.

**Troubleshooting**
Common Jest Issues: Address typical issues such as asynchronous testing errors or unmocked APi calls.


**Test Files Location**
In our project, test files are organized under the __tests__ directory in the folder “components”. It should like like this:
```
/src
/components
  /__tests__
      Button.test.js
      searchbar.test.js
```

**Running Tests**
To run the tests use the npm scripts. Here’s how:
To run all tests:
`npm test`

These command will execute all Jest tests and process all files that match the test patterns defined in our Jest configuration, typically files in the __tests__ directory or any files should end with “.test.js“.

And if you have writen some tests this is how it will look like in the terminal:
![image](https://github.com/domits1/Domits/assets/134588250/5e37b1d8-97be-4cc5-8e1b-198c658e3d52)



Conclusion
Using TDD with Jest for React development not only ensures that the code meets its design and behaves as intended, but also helps in maintaining a clean and manageable code base through regular refactoring.


**Sources:**
https://martinfowler.com/bliki/TestDrivenDevelopment.html
##
https://opensource.com/article/20/1/test-driven-development


