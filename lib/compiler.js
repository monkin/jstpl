
var fs = require("fs")
var path = require("path")

var parser = require("./parser").generate(function(bi) {
		var main_rule = bi.main_rule, rule = bi.rule,
			or = bi.or, and = bi.and, rep = bi.rep,
			maybe = bi.maybe, join = bi.join,
			named = bi.named,
			mbs = maybe("space");
		rule("text", named("text", /^([^@#\$\{\}\\]+|\\[^])+/))
		rule("comment", /(^#\*([^\*]+|\*[^#])*\*#)|(^##.+\r?\n?)/)
		rule("space", /^(\s|(^#\*([^\*]+|\*[^#])*\*#)|(^##.+\n?))+/)
		rule("comma", and(mbs, /^,/, mbs))
		rule("name", named("name", /^[a-zA-Z_][a-zA-Z_0-9]*/))
		rule("number", named("number", /^\d+/))
		rule("string", named("string", and(/^"/, rep(or(
						named("text", /^([^@#\$"\\]+|\\[^])+/),
						"var", "directive", "comment"
					)), /^"/)))
		rule("array", named("array", and(/^\[/, mbs, maybe(join("value", "comma")), mbs, /^\]/)))
		rule("hash", named("hash", and(/^\{/, mbs, maybe(join("pair", "comma")), mbs, /^\}/)))
		rule("text_value", or("name", "number", "var", "string", "directive"))
		rule("value", or("name", "number", "var", "string", "directive", "array", "hash"))
		rule("pair", named("pair", and("text_value", mbs, /^:/ , mbs, "value")))
		rule("directive", named("directive", and(/^@/, "name", mbs, /^\(/, mbs, named("file_name", /^"([^"\\]|\\[^])+"/), mbs, /^\)/)))
		function arg_list(s, e) {
			return named("args", and(s, mbs, maybe(join(or("pair", "value"), "comma")), mbs, e))
		}
		rule("index", named("index", and(/^\[/, mbs, "text_value", mbs, /^\]/)))

		rule("filter", and(mbs, /^\|/, mbs, named("filter", named("var", and(or("name", "index"), rep(or(and(/^\./, "name"), and(mbs, "index"))))))))
		var _var = and(maybe("name"),
			rep(or(and(/^\./, "name"), and(mbs, "index"))),
			maybe(named("call", and(mbs, arg_list(/^\(/, /^\)/), maybe(and(mbs, "block"))))),
			rep("filter"));
		rule("var", named("var", and(/^\$/, _var)))
		rule("block", named("block", and(maybe(arg_list(/^\|/, /^\|/)), mbs, /^\{/, and(rep(or("text", "comment", "var", "directive")), /^\}/))))
		main_rule(rep(or("text", "comment", "var", "directive")))
	})

function parseString(file, string) {
	var r = {
			file: file,
			out: null,
			dependencies: [],
			includes: []
		},
		tree;
		try {
			tree = parser(string);
		} catch(e) {
			throw new Error(file + e.message)
		}
	function unescape(s) {
		return s.replace(/\\[^]/g, function(m) { return m.substring(1, 2) })
	}
	function compileItem(item) {
		var i, c, items, code,
			codeHead, codeTail,
			children = item.children;
		switch (item.name) {
		case "text":
			return JSON.stringify(unescape(item.value()))
		case "name":
		case "number":
			return JSON.stringify(item.value());
		case "string":
			items = []
			if (children) {
				for (i = 0; i < children.length; i++) {
					items.push(compileItem(children[i]))
				}
				return items.join(" + ");
			} else
				return "\"\""
		case "index":
			return compileItem(children[0])
		case "array":
			items = []
			for (i = 0; i < children.length; i++) {
				items.push(compileItem(children[i]))
			}
			return "[" + items.join(", ") + "]"
		case "hash":
			codeHead = "(function() { var r = {}; ",
			codeTail = "return r; })()"
			if (children) {
				for (i = 0; i < children.length; i++) {
					var pair = children[i],
						key = pair.children[0],
						value = pair.children[1];
					codeHead += "r[" + compileItem(key) + "] = " + compileItem(value) + "; ";
				}
			}
			return codeHead + codeTail;
		case "directive":
			var directive = children[0].value(),
				argument = unescape(children[1].value().replace(/^"|"$/g, "")),
				filePath = path.join(path.dirname(file), argument);
			switch (directive) {
			case "include":
				r.includes.push(filePath);
				return "includes[" + JSON.stringify(filePath) + "]"
			case "parse":
				r.dependencies.push(filePath);
				return "dependencies[" + JSON.stringify(filePath) + "]($ctx)"
			default:
				throw new Error("Unknown directive: " + JSON.stringify(directive))
			}
		case "block":
			codeHead = "(function(ctx) { return function($unused, $args) { var $ctx = context(ctx); "
			codeTail = "}})($ctx)"
			items = []
			for(i = 0; i < children.length; i++) {
				c = children[i];
				if(c.name=="args") {
					var al = c.children || []
					for(var j = 0; j < al.length; j++) {
						var argName, argValue;
						if(al[j].name=="pair") {
							argName = compileItem(al[j].children[0])
							argValue = compileItem(al[j].children[1])
						} else {
							argName = compileItem(al[j])
							argValue = "null"
						}
						codeHead += "$ctx[" + argName + "] = "
							+ "$args['" + j + "'] === undefined ? ("
							+ "$args[" + argName + "] === undefined ? "
							+ argValue + ": $args[" + argName + "]"
							+ ") : $args['" + j + "']; "
					}
				} else
					items.push(compileItem(c))
			}
			return codeHead + "return " + items.join(" + ") + "; " + codeTail;
		case "var":
			code = "$ctx"
			if(children) {
				for(i = 0; i < children.length; i++) {
					c = children[i];
					switch(c.name) {
					case "name":
					case "index":
						code = "varIndex(" + code + ", " + compileItem(c) + ")";
						break;
					case "call":
						codeHead = "(function() { var args = {}; ";
						codeTail = "return varCall(" + code + ", $ctx, args); })()";
						(function appendArguments() {
							for(var j = 0; j < c.children.length; j++) {
								var item = c.children[j]
								switch(item.name) {
								case "args":
									if(item.children) {
										for(var n = 0; n < item.children.length; n++) {
											var a = item.children[n];
											if(a.name === "pair") {
												codeHead += "args[" + compileItem(a.children[0]) + "] = " + compileItem(a.children[1]) + "; "
											} else
												codeHead += "args['" + n + "'] = " + compileItem(a) + "; "
										}
									}
									break
								case "block":
									codeHead += "args['yield'] = " + compileItem(item) + "; "
									break
								}
							}
						})()
						code = codeHead + codeTail;
						break;
					case "filter":
						code = "varCall(" + compileItem(c.children[0])
							+ ", $ctx, [" + code + "])"
						break;
					}
				}
			}
			return code;
		default:
			throw new Error("Unknown token \"" + item.name + "\"")
		}
	}
	var i, items = []
	for(i = 0; i < tree.length; i++)
		items.push(compileItem(tree[i]))
	r.out = "function($ctx) { return " + items.join(" + ") + "; }"
	return r;
}

function counter() {
	var v = 0,
		error = null,
		items = [];
	function callHandlers() {
		for(var i in items)
			items[i](error);
		items = []
	}
	return {
		inc: function() {
			if(!error)
				v++
		},
		dec: function() {
			if (!error) {
				v--
				if(v == 0)
					callHandlers()
			}
		},
		fail: function(e) {
			error = e
			v = 0
			callHandlers()
		},
		wait: function(callback) {
			if(v)
				items.push(callback)
			else
				callback(error)
		}
	}
}


function compiler(loader) {
	var compilerObject,
		plugins = {},
		dependencies = {},
		includes = {},
		error = null,
		cnt = counter();
	if(!loader) {
		loader = fileLoader();
	}
	function loadFile(name, callback) {
		cnt.inc()
		loader(name, function(err, content) {
			if (err) {
				cnt.fail(err)
			} else {
				callback(content)
				cnt.dec()
			}
		})
	}
	function getPluginsCode() {
		var i, out = "",
			pathSet = {};
		function createPath(path) {
			var i, ns, items = path.split(".");
			for(i = 1; i < items.length; i++) {
				ns = items.slice(0, i).join(".")
				if (!pathSet[ns]) {
					out += "$ctx['" + ns.replace(".", "']['") + "'] = {}; "
					pathSet[ns] = true
				}
			}
		}
		for (i in plugins) {
			createPath(i)
			out += "$ctx['" + i.replace(".", "']['") + "'] = " + plugins[i] + "; "
		}
		return out;
	}
	function getIncludesCode() {
		return "var includes = " + JSON.stringify(includes) + "; "
	}
	function getDependenciesCode() {
		var codeHead = "var dependencies = {",
			codeTail = "}; ",
			items = [];
		for(var i in dependencies)
			items.push(JSON.stringify(i) + ": " + dependencies[i])
		return codeHead + items.join(", ") + codeTail;
	}

	compilerObject = {
		loadPlugins: function() {
			(function loadPlugins(nameParts, dir) {
				cnt.inc()
				fs.readdir(dir, function(err, files) {
					if(err)
						cnt.fail(err)
					else {
						for(var i in files) {
							cnt.inc();
							(function() {
								var fullName = path.join(dir, files[i]),
									file = files[i];
								fs.stat(fullName, function(err, stat) {
									if(err)
										cnt.fail(err)
									else {
										cnt.dec()
										if(stat.isDirectory()) {
											loadPlugins(nameParts.concat([file]), fullName)
										} else {
											cnt.inc()
											fs.readFile(fullName, "UTF-8", function(err, data) {
												if(err) {
													cnt.fail(err)
												} else {
													plugins[nameParts.concat([file.replace(/\.js$/i, "")]).join(".")] = data
													cnt.dec()
												}
											});
										}
									}
								});
							})()
						}
						cnt.dec()
					}
				})
			})([], path.join(__dirname, "../plugins"))
		},
		plugin: function(name, fileName) {
			if(!plugins[name]) {
				plugins[name] = true
				loadFile(fileName, function(content) {
					plugins[name] = content
				})
			}
		},
		include: function(fileName) {
			if(!includes[fileName]) {
				includes[fileName] = true
				loadFile(fileName, function(content) {
					includes[fileName] = content
				})
			}
		},
		parse: function(fileName) {
			if(!dependencies[fileName]) {
				dependencies[fileName] = true
				loadFile(fileName, function(content) {
					var i, parsed = parseString(fileName, content);
					dependencies[fileName] = parsed.out
					for(i in parsed.includes) {
						compilerObject.include(parsed.includes[i])
					}
					for(i in parsed.dependencies) {
						compilerObject.parse(parsed.dependencies[i])
					}
				})
			}
		},
		getCode: function(callback) {
			cnt.wait(function(err) {
				if(err)
					callback(err, null);
				else {
					callback(null, "(function (fileName, ctx) { "
						+ "\"use strict\";"
						+ "function context() { if(arguments.length) { var rfn = function(){}; rfn.prototype = arguments[0]; return new rfn(); } else return {}; } "
						+ "function varIndex(v, i) { return v ? v[i] : null; } "
						+ "function varCall(v, ctx, args) { return (v && typeof v=='function') ? v(ctx, args) : \"#not_a_function#\"; } "
						+ "var $ctx = context(ctx); "
						+ getPluginsCode() + getIncludesCode() + getDependenciesCode()
						+ "if(dependencies[fileName]) return dependencies[fileName]($ctx); else throw new Error('File not found: \"' + fileName + '\"'); "
						+ "})");
				}
			});
		},
		getFunction: function(callback) {
			compilerObject.getCode(function(err, code) {
				if(err)
					callback(err, null)
				else
					callback(null, new Function("fileName", "ctx", "return " + code + "(fileName, ctx);"))
			})
		}
	}
	return compilerObject
}

function fileLoader(rootPath) {
	if(!rootPath)
		rootPath = "./"
	else if(!/\/$/.test(rootPath))
		root_path += "/"
	return function(fileName, callback) {
		fs.readFile(path.join(rootPath, fileName), "UTF-8", callback)
	}
}

exports.fileLoader = fileLoader
exports.compiler = compiler



