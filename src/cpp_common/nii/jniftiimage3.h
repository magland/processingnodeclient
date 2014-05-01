#ifndef jniftiimage3_H
#define jniftiimage3_H

#include "affinetransformation.h"
#include <QMap>
#include <QVariant>

class JNiftiImage3Private;
class JNiftiImage3 {
public:
	friend class JNiftiImage3Private;
	JNiftiImage3();
	JNiftiImage3(const JNiftiImage3 &X);
	virtual ~JNiftiImage3();
	void operator=(const JNiftiImage3 &X);
	
	bool read(QString nii_fname,bool load_data=true);
	bool write(QString nii_fname);
	void clear();
	
	int N1() const;
	int N2() const;
	int N3() const;
	int N4() const;
	bool allocate(QString data_type,int N1,int N2,int N3,int N4=1);
	//data_type = "uchar", "int16", "int32", "int64", "real32"
	void *data();
	QString dataType() const;
	
	QMap<QString,QVariant> headerParameters() const;
	
	
	AffineTransformation worldTransformation() const;
	void setWorldTransformation(const AffineTransformation &T);
private:
	JNiftiImage3Private *d;
};

#endif
