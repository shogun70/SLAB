VPATH = ${srcdir}

SUBDIRS = source doc

include ${top_srcdir}/mk/gnu.bsdvars.mk

.SUFFIXES :

# Rules
all : build

build :
	for dir in ${SUBDIRS}; do make -C $${dir} build; done

clean :
	for dir in ${SUBDIRS}; do make -C $${dir} clean; done

install : build
	for dir in ${SUBDIRS}; do make -C $${dir} install; done
