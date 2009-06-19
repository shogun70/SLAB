VPATH = ${srcdir}

include ${top_srcdir}/mk/gnu.bsdvars.mk

.SUFFIXES :
.SUFFIXES : .html .xhtml .js .xml .xpl 

TARGETS = SLAB.js
INSTALL_FILES = SLAB.js

XSLTPROC = /usr/bin/xsltproc
XPL2JS = ~/bin/XPL-0.5/xpl2js
XPL = ~/bin/XPL-0.5/xpl
URLINSTALL = ~/bin/URL-Utils-0.6/url-install 

CACHE_CONFIG := ${foreach fname,${UI_TARGETS},--disk-cache ${pkglibexecdir}/${fname} ${.CURDIR}/${fname}}

PARAMS_CONFIG += --param pkglibdir ${pkglibdir}
PARAMS_CONFIG += --param pkgdefaultlibdir ${pkgdefaultlibdir}

# Rules
all : build

depend : .depend

.depend :
	# FIXME
	# ${XPL} --make-depend ${CACHE_CONFIG} ${PARAMS_CONFIG} XBL.xhtml > .depend
	# ${XPL} --make-depend ${CACHE_CONFIG} ${PARAMS_CONFIG} XBLUI.xhtml >> .depend
	
build : ${TARGETS}

install: build
	${URLINSTALL} ${INSTALL_FILES} ${pkglibexecdir}/

clean : 
	-rm ${TARGETS}

SLAB.js : SLAB.xhtml lib/Meeko/DOM.xhtml

.xhtml.js : 
	${XPL} ${CACHE_CONFIG} ${PARAMS_CONFIG} --path ${<D} ${<F} |\
	${JSMIN} - > ${.TARGET}

.xpl.js :
	${XPL2JS} ${.IMPSRC} > ${.TARGET}
