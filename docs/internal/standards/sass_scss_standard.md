# SASS / SCSS Standard

## Tutorial
[SASS / SCSS tutorial](https://www.youtube.com/watch?v=Zz6eOVaaelI)


## Standard
To ensure you don't mess up other people's styling when you add your own, using SASS/SCSS is important.

The tutorial above is a good resource for a basic understanding of SASS, but it's not essential. What is important to implement in your code is class name nesting.

This is how styling is currently applied to components.

CSS code
```
.calendar-component
{
    random-styling: red;
}

.date
{
    color: green;
}

.column
{
    display: flex;
}
```
However, this isn't ideal because you're currently setting all elements with the class name "date" to green, while you only want to call the element with the class name "date" that's in the calendar component.

To solve this, you need to use class name nesting, which is easily done with SASS/SCSS.

SASS / SCSS code
```
.calendar-component
{
    random-styling: red;
    
    .date
    {
        color: green;
    }
    
    .column
    {
        display: flex;
    }
}
```

In this case, the calendar-component class is the root element with the class name calendar-component in the object.
When you create a component, make sure that all styling you apply to the element is contained in the component's root class. This way, you don't overwrite the styling of other components.


## Starting SASS / SCSS

To start SASS/SCSS, you need to create a custom command in the package.json. Because we're using React, this isn't necessary, as React automatically grabs the .scss files. If you do want to use a command, you have two options:

The first option is ```npm run watch``` into the terminal. This command will check the app.scss for changes and compile it to the index.css.

Command Breakdown:

```
--watch: Tells Sass to monitor the specified SCSS file for changes.
src/styles/sass/app.scss: The input SCSS file to watch.
src/index.css: The output CSS file that will be generated.
```

The second option is to ```npm run build-sass``` this ensures that everything in app.scss is compiled into index.css only once. You rarely use this command, except during the build in Amplify. We don't want the server constantly checking for changes in app.scss, as that would prevent the build from completing. Therefore, we only use this command during the build.

Command Breakdown:

```
src/styles/sass/app.scss: The input SCSS file to compile.
src/index.css: The output CSS file that will be generated.
```

## SCSS folder
To keep everything organized, a folder has been created where you put all the .scss files. Inside this folder, create a new folder with the name of the component to which the files belong, as shown here:

```
web
├── src
│   ├── styles
│   │   ├── sass
│   │   │   ├── app.scss
│   │   │   ├── booking-engine
│   │   │   │   ├── imagegallery.scss
│   │   │   │   ├── listing.scss
│   │   │   │   ├── bookingoverview.scss
│   │   │   │   ├── paymentConfirmPage.scss
│   │   │   │   └── ...
│   │   │   ├── base
│   │   │   │   ├── header.scss
│   │   │   │   ├── footer.scss
│   │   │   │   └── ...
│   │   │   ├── auth
│   │   │   │   ├── login.scss
│   │   │   │   └── ...
│   │   │   └── ...
```