# JS templates compiler.

## Using

	tpl2js [-fn function_name] [-o output_file.js] template1.tpl template2.tpl template3.tpl ...

## Options

* -o - output file (stdout by default)
* -fn - function name (tpl2js by default)

## Example

### books.tpl:
	
	<div class="book_list">
		${foreach($books) |b| #
			<a href="/book/${b.id|utils.html.escape}">${b.name|utils.html.escape}</a>
		#end}
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
	
	${title} ## Insert variable value
	${test_fn($test 1 "Заголовок: ${title}")} ## Function call
	
	## Call  function with two arguments: first - array, second - hash
	${test_fn2([1 2 $title "str"] {
			color: "red"
			name: "Test"
			"${title}": "Title"
		})
	
	## Call function "if" with argument and block. (see "plugins" dir)
	${if($title) #
		<div>${title}</div>
	#end}
	
	## Create macro (user function).
	## Second and thrid arguments have default values.
	${lambda(my_fn) |arg1 arg2:"None" id:${utils.id()}| #
		<div id="${id}" class="${arg1}">${arg2}</div>
	#end}
	
	## Call my_fn.
	## Argument "id" passed by name.
	${my_fn("cl" id:"my_id")}
	
	${str_fn()|utils.html.escape} ## Equals ${utils.html.escape(${str_fn()})}
	
	## See "plugins" directory for plugin examples.
