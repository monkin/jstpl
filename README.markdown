# JS templates compiler.

## Using

	tpl2js [--function=function_name] [--out=output_file.js] [--plugins=no] template1.tpl template2.tpl template3.tpl ...

## Options

* --out - output file (stdout by default)
* --function - function name (tpl2js by default)
* --plugins - yes|no use or don't use default plugins

## Example

### books.tpl:
	
	<div class="book_list">
		$foreach($books) |b| {
			<a href="/book/$b.id|utils.html.escape">$b.name|utils.html.escape</a>
		}
	</div>

### compile:

	tpj2js -o books_tpl.js books.tpl

### use.js:

	...
	var books = [{ id: 1, name: "Игра в классики" }, { id: 1, name: "Игра в биссер" }]
	var books_html = tpl2js("books.tpl", { books: books })
	...

## Syntax
	
	## One-line comment
	#*
		Comment
		\# \$ \\ \" - escaping
	*#
	
	$title ## Insert variable value
	$test_fn($test, 1, "Заголовок: $title") ## Function call
	
	## Call  function with two arguments: first - array, second - hash
	$test_fn2([1, 2, $title, "str"] {
		color: "red",
		name: "Test",
		"$title": "Title"
	})
	
	## Call function "if" with argument and block. (see "plugins" dir)
	$if($title) {
		<div>$title</div>
	}
	
	## Create macro (user function).
	## Second and thrid arguments have default values.
	$lambda(my_fn) |arg1, arg2:"None", id:$utils.id()| {
		<div id="$id" class="$arg1">$arg2</div>
	}
	
	## Call my_fn.
	## Argument "id" passed by name.
	$my_fn("cl", id:"my_id")
	
	$str_fn()|utils.html.escape ## Equals $utils.html.escape($str_fn())
	
	## See "plugins" directory for plugin examples.
