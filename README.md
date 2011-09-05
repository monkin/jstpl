# JS templates compiler.

## Using

	tpj2js.js [-fn function_name] [-o output_file.js] template1.tpl template2.tpl template3.tpl ...

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

	tpj2js.js -o books_tpl.js books.tpl

### use.js:

	...
	var books = [{ id: 1, name: "Игра в классики" }, { id: 1, name: "Игра в биссер" }]
	var books_html = tpl2js("books.tpl", { books: books })
	...

