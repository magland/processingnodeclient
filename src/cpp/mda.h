#ifndef MDA_H
#define MDA_H

#include <QString>

class mda_private;
class mda {
public:
	friend class mda_private;
	mda();
	mda(const mda &X);
	virtual ~mda();
	bool load(const QString &fname);
	bool save(const QString &fname) const;
	void operator=(const mda &X);
	void allocate(int N1,int N2=1,int N3=1,int N4=1);
	void allocateUint8(int N1,int N2=1,int N3=1,int N4=1);
	void allocateFloat32(int N1,int N2=1,int N3=1,int N4=1);
	void allocateComplex(int N1,int N2=1,int N3=1,int N4=1);
	int N1() const;
	int N2() const;
	int N3() const;
	int N4() const;
	QString dataType() const;
	float getValue(int i1,int i2=0,int i3=0,int i4=0) const;
	float getValueImag(int i1,int i2=0,int i3=0,int i4=0) const;
	void setValue(float val,int i1,int i2=0,int i3=0,int i4=0);
	void setValueImag(float val,int i1,int i2=0,int i3=0,int i4=0);
	void *data();
	void *dataImag();
private:
	mda_private *d;
};

#endif
