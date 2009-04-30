/*
This API and implementation based on:
W3C Simple API for CSS
	http://www.w3.org/TR/SAC
See also:
1. Java implementation
	http://www.w3.org/Style/CSS/SAC/doc/org/w3c/css/sac/package-summary.html
2. Perl implementation	
	http://search.cpan.org/~bjoern/CSS-SAC-0.06/SAC.pm
*/

/*
TODO
- DocumentHandler & ErrorHandler
- stylesheet & property parsing
*/

if (!CSS) var CSS = {};

CSS.SAC = (function() {	

var Selector = function() {}
Selector.SAC_UNKNOWN_SELECTOR = -1;
Selector.SAC_CONDITIONAL_SELECTOR = 0;
Selector.SAC_ANY_NODE_SELECTOR = 1;
Selector.SAC_ROOT_NODE_SELECTOR = 2;
Selector.SAC_NEGATIVE_SELECTOR = 3;
Selector.SAC_ELEMENT_NODE_SELECTOR = 4;
Selector.SAC_TEXT_NODE_SELECTOR = 5;
Selector.SAC_CDATA_SECTION_NODE_SELECTOR = 6;
Selector.SAC_PROCESSING_INSTRUCTION_NODE_SELECTOR = 7;
Selector.SAC_COMMENT_NODE_SELECTOR = 8;
Selector.SAC_PSEUDO_ELEMENT_SELECTOR = 9;
Selector.SAC_DESCENDANT_SELECTOR = 10;
Selector.SAC_CHILD_SELECTOR = 11;
Selector.SAC_DIRECT_ADJACENT_SELECTOR = 12;
Selector.SAC_INDIRECT_ADJACENT_SELECTOR = 13;

var Condition = function() {}
Condition.SAC_UNKNOWN_CONDITION = -1;
Condition.SAC_AND_CONDITION = 0;
Condition.SAC_OR_CONDITION = 1;
Condition.SAC_NEGATIVE_CONDITION = 2;
Condition.SAC_POSITIONAL_CONDITION = 3;
Condition.SAC_ATTRIBUTE_CONDITION = 4;
Condition.SAC_ID_CONDITION = 5;
Condition.SAC_LANG_CONDITION = 6;
Condition.SAC_ONE_OF_ATTRIBUTE_CONDITION = 7;
Condition.SAC_BEGIN_HYPHEN_ATTRIBUTE_CONDITION = 8;
Condition.SAC_CLASS_CONDITION = 9;
Condition.SAC_PSEUDO_CLASS_CONDITION = 10;
Condition.SAC_ONLY_CHILD_CONDITION = 11;
Condition.SAC_ONLY_TYPE_CONDITION = 12;
Condition.SAC_CONTENT_CONDITION = 13;
Condition.SAC_CONTAINS_ATTRIBUTE_CONDITION = 14;
Condition.SAC_STARTS_WITH_ATTRIBUTE_CONDITION = 15;
Condition.SAC_ENDS_WITH_ATTRIBUTE_CONDITION = 16;
Condition.SAC_IS_ROOT_CONDITION = 17;
Condition.SAC_IS_EMPTY_CONDITION = 18;


var Parser = function() {
	this.selectorFactory = new SelectorFactory();
	this.conditionFactory = new ConditionFactory();
}


/*
	parseSelectors() modified from code written by:
	Joe Hewitt
	http://www.joehewitt.com/blog/files/getElementsBySelector.js
	
	TODO namespaces
*/

Parser.prototype.parseSelectors = function(selectorText)
{
	var text = selectorText;

	var sf = this.selectorFactory;
	var cf = this.conditionFactory;
	
	var selectorList = [];
	var selector = null;
	var si = null; // current Selector
	var sc = null; // pending Selector combination
	var cc = null; // combo Condition
	var ci = null; // current Condition

	function mergeCondition() {	
		cc = (cc) ? sf.createAndCondition(cc, ci) : ci;
		ci = null;
	}

	function mergeSimpleSelector() {
		if (!si) si = sf.createElementSelector(null, "*");
		if (cc) si = sf.createConditionalSelector(si, cc);
		cc = null;
		switch (sc) {
			case ">": selector = sf.createChildSelector(selector, si); break;
			case "~": selector = sf.createIndirectAdjacentSelector(selector, si); break;
			case "+": selector = sf.createDirectAdjacentSelector(Node.ELEMENT_NODE, selector, si); break;
			case " ": selector = sf.createDescendantSelector(Node.ELEMENT_NODE, selector, si); break;
			case null: selector = si; break; // no combinator means this is first time through
		}
		si = null;
		sc = null;
	}
	
	function mergeSelector() {
		selectorList.push(selector);
		selector = null;
	}
		
	var ns = null;
	var name = null;

	var state = 0;

OUTER:
	do {
		var m = null;

INNER:
		switch (state) {
			case 0:
				m = /^\s*/.exec(text);
				if (m) {
					state = 1;
					text = text.substr(m[0].length);
					break;
				}
				break;
		
			case 1:
				// Element / Universal
				m = /^(\*|[a-zA-Z0-9_]+)(\|(\*|[a-zA-Z0-9_-]+))?/.exec(text);
				if (m) {
					if (m[3]) {	ns = m[1]; name = m[3];	}
					else { ns = null; name = m[1]; }
					si = sf.createElementSelector(name, ns);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
		
			case 2:
				// ID
				m = /^#([a-zA-Z0-9_]+)/.exec(text);
				if (m) {
					ci = cf.createIdCondition(m[1]);
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
	
				// Class
				m = /^\.([a-zA-Z0-9_-]*)/.exec(text);
				if (m) {
					ci = cf.createClassCondition(null, m[1]);
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
	
				// Attribute
				m = /^\[\s*([a-z0-9_-]+)(\|([a-z0-9_-]+))?\s*(([~|^$*]?=)\s*(['"]?)([^\6]*)\6\s*)?\]/.exec(text);
				if (m) {
					if (m[3]) { ns = m[1]; name = m[3]; }
					else { ns = null; name = m[1]; }
					if (m[4]) {
						value = m[7];
						switch(m[5]) {
							case "~=": ci = cf.createOneOfAttributeCondition(name, ns, true, value); break;
							case "|=": ci = cf.createBeginHyphenAttributeCondition(name, ns, true, value); break;
							case "^=": ci = cf.createStartsWithAttributeCondition(name, ns, true, value); break;
							case "$=": ci = cf.createEndsWithAttributeCondition(name, ns, true, value); break;
							case "*=": ci = cf.createContainsAttributeCondition(name, ns, true, value); break;
							case "=": ci = cf.createAttributeCondition(name, ns, true, value); break;
						}
					}
					else {
						ci = cf.createAttributeCondition(name, ns, false, null);
					}
	
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				// Pseudo-element.
				m = /^::([a-zA-Z_-]+)/.exec(text) ||
					/^:(first-line)/.exec(text) ||
					/^:(first-letter)/.exec(text) ||
					/^:(before)/.exec(text) ||
					/^:(after)/.exec(text);	
				if (m) {
					ci = cf.createPseudoElementCondition(m[1]);
					mergeCondition();
					state = 4;
					text = text.substr(m[0].length);
					break;
				}
				
				// Only-child
				m = /^:only-(child|of-type)/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					ci = (same_type) ? cf.createOnlyTypeCondition() : cf.createOnlyChildCondition();
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				// Positionals
				m = /^:first-(child|of-type)/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					var a = 0, b = 0;
					ci = cf.createPositionalCondition([a, b], same_type, true);
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				m = /^:nth-(child|of-type)\(/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					text = text.substr(m[0].length);
					m = /^\s*(odd|even)\s*\)/.exec(text); // TODO an+b
					var a = 0, b = 0;
					switch (m[1]) {
						case "even": a = 2; b = 0; break;
						case "odd": a = 2; b = 1; break;
					}
					ci = cf.createPositionalCondition([a, b], same_type, true);
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
					
				
				// Pseudo-class.  
				m = /^:([a-zA-Z_-]+)/.exec(text);
				if (m) {
					ci = cf.createPseudoClassCondition(null, m[1]);
					mergeCondition();
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
			case 3:
				// Combinators
				m = /^\s*([\s>~+])/.exec(text);
				if (m) {
					mergeSimpleSelector();
					sc = m[1];
					state = 0;
					text = text.substr(m[0].length);
					break;
				}
				
			case 4:
				// Selector grouping
				m = /^\s*,/.exec(text);
				if (m) {
					mergeSimpleSelector();
					mergeSelector();
					state = 0;
					text = text.substr(m[0].length);
					break;
				}
		
				break;
		}

		
	} while (text.length && m);
	
	mergeSimpleSelector();
	mergeSelector();
	
	return selectorList;
}


var SelectorFactory = function() {}
SelectorFactory.prototype.createChildSelector = function(parent, child) {
}

SelectorFactory.prototype.createConditionalSelector = function(selector, condition) {
}

SelectorFactory.prototype.createDescendantSelector = function(parent, descendant) {
}

SelectorFactory.prototype.createDirectAdjacentSelector = function(nodeType, child, adjacent) {
}

SelectorFactory.prototype.createIndirectAdjacentSelector = function(nodeType, child, adjacent) {
}

SelectorFactory.prototype.createElementSelector = function(ns, name) {
	return { ns: ns, name: name }
}


var ConditionFactory = function() {}
ConditionFactory.prototype.createAndCondition = function(first, second) {
}

ConditionFactory.prototype.createAttributeCondition = function(name, ns, specified, value) {
}

ConditionFactory.prototype.createBeginHyphenAttributeCondition = function(name, ns, specified, value) {
}

ConditionFactory.prototype.createClassCondition = function(ns, value) {
}

ConditionFactory.prototype.createIdCondition = function(value) {
}

ConditionFactory.prototype.createOneOfAttributeCondition = function(name, ns, specified, value) {
}

ConditionFactory.prototype.createOnlyChildCondition = function() {
}

ConditionFactory.prototype.createOrCondition = function(first, second) {
}

ConditionFactory.prototype.createPositionalCondition = function(position, typeNode, type) {
}

ConditionFactory.prototype.createPseudoClassCondition = function(ns, value) {
}


Selector.prototype.test = function(element) {
	var curElt = element;
	var result;
	switch(this.Type) {
		case Selector.SAC_ELEMENT_NODE_SELECTOR:
			return (curElt.tagName == this.value);
			break;
		case Selector.SAC_CONDITIONAL_SELECTOR:
			result = this.getSimpleSelector().test(curElt);
			if (!result) return false;
			result = this.getCondition().test(curElt);
			return result;
		case Selector.SAC_DESCENDANT_SELECTOR:
			result = this.getSimpleSelector().test(curElt);
			if (!result) return false;
			result = false;
			while (document.documentElement != curElt) {
				curElt = curElt.parentNode;
				result = this.getAncestorSelector().test(curElt);
				if (result) break;
			}
			return result;
			break;	
	}
	return;
}



return {
	Parser: Parser,
	Selector: Selector,
	Condition: Condition,
	SelectorFactory: SelectorFactory,
	ConditionFactory: ConditionFactory
}

})();