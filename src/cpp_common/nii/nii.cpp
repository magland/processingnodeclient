#include "nii.h"
#include "mda.h"
#include <stdio.h>
#include <QDebug>
#include "jniftiimage3.h"

class nii_private {
public:
	mda m_array;
	AffineTransformation m_transformation;
	
	void copy_from(const nii &X);
};

void nii_private::copy_from(const nii &X) {
	m_array=X.d->m_array;
	m_transformation=X.d->m_transformation;
}

nii::nii() {
	d=new nii_private;
}
nii::nii(const nii &X) {
	d=new nii_private;
	d->copy_from(X);
}
nii::~nii() {
	delete d;
}

bool nii::load(const QString &fname) {
	//finish this one!
	
	JNiftiImage3 XX;
	if (!XX.read(fname,true)) {
		return false;
	}
	if (XX.dataType()=="uchar") {
		d->m_array.allocateUint8(XX.N1(),XX.N2(),XX.N3(),XX.N4());
		long NN=XX.N1()*XX.N2()*XX.N3()*XX.N4();
		quint8 *data1=(quint8 *)d->m_array.data();
		unsigned char *data2=(unsigned char *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data1[ii]=data2[ii];
		}
	}
	else if (XX.dataType()=="int16") {
		d->m_array.allocateFloat32(XX.N1(),XX.N2(),XX.N3(),XX.N4());
		long NN=XX.N1()*XX.N2()*XX.N3()*XX.N4();
		float *data1=(float *)d->m_array.data();
		qint16 *data2=(qint16 *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data1[ii]=data2[ii];
		}
	}
	else if (XX.dataType()=="int32") {
		d->m_array.allocateFloat32(XX.N1(),XX.N2(),XX.N3(),XX.N4());
		long NN=XX.N1()*XX.N2()*XX.N3()*XX.N4();
		float *data1=(float *)d->m_array.data();
		qint32 *data2=(qint32 *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data1[ii]=data2[ii];
		}
	}
	else if (XX.dataType()=="int64") {
		d->m_array.allocateFloat32(XX.N1(),XX.N2(),XX.N3(),XX.N4());
		long NN=XX.N1()*XX.N2()*XX.N3()*XX.N4();
		float *data1=(float *)d->m_array.data();
		qint64 *data2=(qint64 *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data1[ii]=data2[ii];
		}
	}
	else if (XX.dataType()=="real32") {
		d->m_array.allocateFloat32(XX.N1(),XX.N2(),XX.N3(),XX.N4());
		long NN=XX.N1()*XX.N2()*XX.N3()*XX.N4();
		float *data1=(float *)d->m_array.data();
		float *data2=(float *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data1[ii]=data2[ii];
		}
	}
	else {
		qWarning() << "Unrecognized data type for nii: "+XX.dataType();
		return false;
	}
	return true;
}
bool nii::save(const QString &fname) const {
	JNiftiImage3 XX;
	QString dt=d->m_array.dataType();
	int N1=d->m_array.N1();
	int N2=d->m_array.N2();
	int N3=d->m_array.N3();
	int N4=d->m_array.N4();
	long NN=N1*N2*N3*N4;
	if (dt=="uint8") {
		XX.allocate("uchar",N1,N2,N3,N4);
		quint8 *data1=(quint8 *)d->m_array.data();
		unsigned char *data2=(unsigned char *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data2[ii]=data1[ii];
		}
	}
	else if (dt=="float32") {
		XX.allocate("real32",N1,N2,N3,N4);
		float *data1=(float *)d->m_array.data();
		float *data2=(float *)XX.data();
		for (long ii=0; ii<NN; ii++) {
			data2[ii]=data1[ii];
		}
	}
	else {
		qWarning() << "Unrecognized data type in save for nii: "+dt;
		return false;
	}
	return XX.write(fname);
}

void nii::operator=(const nii &X) {
	d->copy_from(X);
}
void nii::allocate(int N1,int N2,int N3,int N4) {
	d->m_array.allocate(N1,N2,N3,N4);
}
void nii::allocateUint8(int N1,int N2,int N3,int N4) {
	d->m_array.allocateUint8(N1,N2,N3,N4);
}
void nii::allocateFloat32(int N1,int N2,int N3,int N4) {
	d->m_array.allocateFloat32(N1,N2,N3,N4);
}
float nii::getValue(int i1,int i2,int i3,int i4) const {
	return d->m_array.getValue(i1,i2,i3,i4);
}
void nii::setValue(float val,int i1,int i2,int i3,int i4) {
	d->m_array.setValue(val,i1,i2,i3,i4);
}
int nii::N1() const {
	return d->m_array.N1();
}
int nii::N2() const {
	return d->m_array.N2();
}
int nii::N3() const {
	return d->m_array.N3();
}
int nii::N4() const {
	return d->m_array.N4();
}
void *nii::data() {
	return d->m_array.data();
}
AffineTransformation nii::getTransformation() const {
	return d->m_transformation;
}
void nii::setTransformation(const AffineTransformation &T) {
	d->m_transformation=T;
}
