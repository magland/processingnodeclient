#ifndef NII_H
#define NII_H

#include <QString>
#include "affinetransformation.h"

class nii_private;
class nii {
public:
	friend nii_private;
	nii();
	nii(const nii &X);
	virtual ~nii();
	bool load(const QString &fname);
	bool save(const QString &fname) const;
	void operator=(const nii &X);
	void allocate(int N1,int N2=1,int N3=1,int N4=1);
	void allocateUint8(int N1,int N2=1,int N3=1,int N4=1);
	void allocateFloat32(int N1,int N2=1,int N3=1,int N4=1);
	int N1() const;
	int N2() const;
	int N3() const;
	int N4() const;
	float getValue(int i1,int i2=0,int i3=0,int i4=0) const;
	void setValue(float val,int i1,int i2=0,int i3=0,int i4=0);
	void *data();
	AffineTransformation getTransformation() const;
	void setTransformation(const AffineTransformation &T);
private:
	nii_private *d;
};

#endif
