# markdown-doctest

Test all the code in your markdown docs!

## Why on earth?

As an open source developer, there are few things more embarrassing than a user opening an issue to inform you that your README example is broken! With  `markdown-doctest`, you can rest easy knowing that your example code is *actually runnable*.

## Installation
Just `npm install markdown-doctest` and run `markdown-doctest`. It will run all of the Javascript code examples tucked away in your markdown, and let you know if any blow up.

## Okay, how do I use it?

Let's try it on this repo!

```c
#include <assert.h>
int main() {
        assert(1 + 1 == 2);
}
```

There's a problem with that example. `markdown-doctest` finds it for us:

Awesome! No excuse for broken documentation ever again, right? :wink:

We can also run specific files or folders by running `markdown-doctest` with a glob, like `markdown-doctest docs/**/*.md`. By default `markdown-doctest` will recursively run all the `.md` or `.markdown` files starting with the current directory, with the exception of the `node_modules` directory.

Note: `markdown-doctest` doesn't actually attempt to provide any guarantee that your code worked, only that it didn't explode in a horrible fashion. If you would like to use `markdown-doctest` for actually testing the correctness of your code, you can add some `assert`s to your examples.

`markdown-doctest` is not a replacement for your test suite. It's designed to run with your CI build and give you peace of mind that all of your examples are at least vaguely runnable.
