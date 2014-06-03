TEMPLATE =	app

OBJECTS_DIR = build
DESTDIR = $destdir$
TARGET = $target$

INCLUDEPATH += .
DEPENDPATH += .
HEADERS += $headers$
SOURCES += custom_cpp.cpp $sources$

HEADERS += textfile.h mda.h qwait.h
SOURCES += textfile.cpp mda.cpp qwait.cpp

#QJSON
LIBS += -lqjson
HEADERS += qjson.h
SOURCES += qjson.cpp

$using_nii$

#nii
!isEmpty(USING_NII) {
	INCLUDEPATH += $commondir$/nii
	DEPENDPATH += $commondir$/nii
	HEADERS += nii.h affinetransformation.h
	SOURCES += nii.cpp affinetransformation.cpp
	HEADERS += jniftiimage3.h
	SOURCES += jniftiimage3.cpp
	HEADERS += niftilib/nifti1_io.h niftilib/nifti1.h
	SOURCES += niftilib/nifti1_io.c 
	HEADERS += niftilib/znzlib.h
	SOURCES += niftilib/znzlib.c
}
