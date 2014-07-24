#include "mda.h"
#include <stdio.h>
#include <QDebug>

class mda_private {
public:
	int m_N1,m_N2,m_N3,m_N4;
	long m_NN;
	float *m_float32_data;
	float *m_float32_imag_data;
	quint8 *m_uint8_data;
	QString m_data_type; //"uint8", "float32", "complex"
	
	void initialize_data();
	void cleanup_data();
	void copy_from(const mda &X);
	long get_index1(int i1,int i2,int i3,int i4);
	void allocateUint8(int N1,int N2,int N3,int N4);
	void allocateFloat32(int N1,int N2,int N3,int N4);
	void allocateComplex(int N1,int N2,int N3,int N4);
};
void mda_private::initialize_data() {
	m_N1=m_N2=m_N3=m_N4=0;
	m_NN=0;
	m_float32_data=0;
	m_float32_imag_data=0;
	m_uint8_data=0;
	m_data_type="";
}
void mda_private::cleanup_data() {
	m_N1=m_N2=m_N3=m_N4=0;
	m_NN=0;
	if (m_float32_data) delete m_float32_data;
	if (m_float32_imag_data) delete m_float32_imag_data;
	if (m_uint8_data) delete m_uint8_data;
	m_float32_imag_data=0;
	m_float32_data=0;
	m_uint8_data=0;
	m_data_type="";
}
void mda_private::copy_from(const mda &X) {
	if (X.d->m_float32_data) {
		if (X.d->m_float32_imag_data) {
			allocateComplex(X.d->m_N1,X.d->m_N2,X.d->m_N3,X.d->m_N4);
			for (long i=0; i<m_NN; i++) m_float32_data[i]=X.d->m_float32_data[i];
			for (long i=0; i<m_NN; i++) m_float32_imag_data[i]=X.d->m_float32_imag_data[i];
		}
		else {
			allocateFloat32(X.d->m_N1,X.d->m_N2,X.d->m_N3,X.d->m_N4);
			for (long i=0; i<m_NN; i++) m_float32_data[i]=X.d->m_float32_data[i];
		}
	}
	else if (X.d->m_uint8_data) {
		allocateUint8(X.d->m_N1,X.d->m_N2,X.d->m_N3,X.d->m_N4);
		for (long i=0; i<m_NN; i++) m_uint8_data[i]=X.d->m_uint8_data[i];
	}
	else {
		qWarning() << "In copy from: data is null.";
	}
}
long mda_private::get_index1(int i1,int i2,int i3,int i4) {
	if ((i1<0)||(i1>=m_N1)) return -1;
	if ((i2<0)||(i2>=m_N2)) return -1;
	if ((i3<0)||(i3>=m_N3)) return -1;
	if ((i4<0)||(i4>=m_N4)) return -1;
	return i1+m_N1*i2+m_N1*m_N2*i3+m_N1*m_N2*m_N3*i4;
}
void mda_private::allocateUint8(int N1,int N2,int N3,int N4) {
	cleanup_data();
	m_N1=N1; m_N2=N2; m_N3=N3; m_N4=N4;
	m_NN=N1*N2*N3*N4;
	if (m_NN>0) m_uint8_data=new quint8[m_NN];
	else m_uint8_data=new quint8[1];
	m_data_type="uint8";
}
void mda_private::allocateFloat32(int N1,int N2,int N3,int N4) {
	cleanup_data();
	m_N1=N1; m_N2=N2; m_N3=N3; m_N4=N4;
	m_NN=N1*N2*N3*N4;
	if (m_NN>0) m_float32_data=new float[m_NN];
	else m_float32_data=new float[1];
	m_data_type="float32";
}
void mda_private::allocateComplex(int N1,int N2,int N3,int N4) {
	cleanup_data();
	m_N1=N1; m_N2=N2; m_N3=N3; m_N4=N4;
	m_NN=N1*N2*N3*N4;
	if (m_NN>0) {
		m_float32_data=new float[m_NN];
		m_float32_imag_data=new float[m_NN];
	}
	else {
		m_float32_data=new float[1];
		m_float32_imag_data=new float[1];
	}
	m_data_type="complex";
}

mda::mda() {
	d=new mda_private;
	d->initialize_data();
}
mda::mda(const mda &X) {
	d=new mda_private;
	d->initialize_data();
	d->copy_from(X);
}
mda::~mda() {
	d->cleanup_data();
	delete d;
}

#define MAX_MDA_DIMS 50
#define MDA_TYPE_COMPLEX -1
#define MDA_TYPE_UINT8 -2
#define MDA_TYPE_FLOAT32 -3
#define MDA_TYPE_INT16 -4
#define MDA_TYPE_INT32 -5
#define MDA_TYPE_UINT16 -6

bool mda::load(const QString &fname) {
	printf("load mda.... %s\n",fname.toAscii().data());
	FILE *inf=fopen(fname.toAscii().data(),"rb");
	if (!inf) return false;
	qint32 hold_num_dims;
	qint32 hold_dims[MAX_MDA_DIMS];
	for (int jj=0; jj<MAX_MDA_DIMS; jj++) hold_dims[jj]=1;
	if (fread(&hold_num_dims,sizeof(qint32),1,inf)<=0) {
		fclose(inf);
		return false;
	}
	qint32 data_type;
	qint32 num_bytes;
	if (hold_num_dims<0) {
		data_type=hold_num_dims;
		fread(&num_bytes,sizeof(qint32),1,inf);
		fread(&hold_num_dims,sizeof(qint32),1,inf);
	}
	else {
		data_type=MDA_TYPE_COMPLEX;
		num_bytes=8;
	}
	if (hold_num_dims>MAX_MDA_DIMS) {
		fclose(inf);
		return false;
	}
	if (hold_num_dims<=0) {
		fclose(inf);
		return false;
	}
	if (hold_num_dims>4) {
		qWarning() << "For now, unable to support mda with >4 dimensions.";
		fclose(inf);
		return false;
	}
	if (data_type==MDA_TYPE_COMPLEX) {
		qWarning() << "For now, unable to support complex mda.";
		fclose(inf);
		return false;
	}
	for (qint32 j=0; j<hold_num_dims; j++) {
		qint32 holdval;
		fread(&holdval,sizeof(qint32),1,inf);
		hold_dims[j]=holdval;
	}
	printf("data_type=%d\n",data_type);
	if (data_type==MDA_TYPE_UINT8) {
		allocateUint8(hold_dims[0],hold_dims[1],hold_dims[2],hold_dims[3]);
		quint8 *data0=(quint8 *)data();
		long num_bytes_read=fread(data0,num_bytes,d->m_NN,inf);
		if (num_bytes_read!=d->m_NN) {
			qWarning() << "Problem reading mda data" << num_bytes_read << d->m_NN;
			fclose(inf);
			return false;
		}
	}
	else if (data_type==MDA_TYPE_FLOAT32) {
		allocateFloat32(hold_dims[0],hold_dims[1],hold_dims[2],hold_dims[3]);
		float *data0=(float *)data();
		long num_bytes_read=fread(data0,num_bytes,d->m_NN,inf);
		if (num_bytes_read!=d->m_NN) {
			qWarning() << "Problem reading mda data" << num_bytes_read << d->m_NN;
			fclose(inf);
			return false;
		}
	}
	else if (data_type==MDA_TYPE_COMPLEX) {
		allocateComplex(hold_dims[0],hold_dims[1],hold_dims[2],hold_dims[3]);
		float *tmp=new float[d->m_NN*2];
		if (fread(tmp,num_bytes,d->m_NN*2,inf)!=d->m_NN*2) {
			qWarning() << "Problem reading mda data";
			delete tmp;
			fclose(inf);
			return false;
		}
		float *data0=(float *)data();
		float *data1=(float *)dataImag();
		for (int i=0; i<d->m_NN; i++) {
			data0[i]=tmp[i*2];
			data1[i]=tmp[i*2+1];
		}
		delete tmp;
	}
	else {
		qWarning() << "For now, unable to support this mda type: " << data_type;
		fclose(inf);
		return false;
	}
	
	fclose(inf);
	return true;
}
bool mda::save(const QString &fname) const {
	printf("save mda....\n");
	FILE *outf=fopen(fname.toAscii().data(),"wb");
	if (!outf) return false;
	qint32 hold_num_dims=4;
	qint32 hold_dims[MAX_MDA_DIMS];
	hold_dims[0]=N1();
	hold_dims[1]=N2();
	hold_dims[2]=N3();
	hold_dims[3]=N4();
	qint32 hold_num_bytes=1;
	qint32 data_type=0;
	if (d->m_uint8_data) {
		hold_num_bytes=1;
		data_type=MDA_TYPE_UINT8;
	}
	else if (d->m_float32_data) {
		if (!d->m_float32_imag_data) {
			hold_num_bytes=4;
			data_type=MDA_TYPE_FLOAT32;
		}
		else {
			hold_num_bytes=8;
			data_type=MDA_TYPE_COMPLEX;
		}
	}
	else {
		qWarning() << "Problem in save (166)";
		fclose(outf);
		return false;
	}
	fwrite(&data_type,sizeof(qint32),1,outf);
	fwrite(&hold_num_bytes,sizeof(qint32),1,outf);
	fwrite(&hold_num_dims,sizeof(qint32),1,outf);
	for (qint32 j=0; j<hold_num_dims; j++) {
		qint32 holdval=hold_dims[j];
		fwrite(&holdval,sizeof(qint32),1,outf);
	}
	if (data_type==MDA_TYPE_UINT8) {
		quint8 *data0=d->m_uint8_data;
		if (fwrite(data0,hold_num_bytes,d->m_NN,outf)!=d->m_NN) {
			qWarning() << "Problem writing mda data";
			fclose(outf);
			return false;
		}
	}
	else if (data_type==MDA_TYPE_FLOAT32) {
		float *data0=d->m_float32_data;
		if (fwrite(data0,hold_num_bytes,d->m_NN,outf)!=d->m_NN) {
			qWarning() << "Problem writing mda data";
			fclose(outf);
			return false;
		}
	}
	else if (data_type==MDA_TYPE_COMPLEX) {
		float *data0=d->m_float32_data;
		float *data1=d->m_float32_imag_data;
		float *tmp=new float[d->m_NN*2];
		for (int i=0; i<d->m_NN; i++) {
			tmp[i*2]=data0[i];
			tmp[i*2+1]=data1[i];
		}
		if (fwrite(tmp,hold_num_bytes,d->m_NN,outf)!=d->m_NN) {
			qWarning() << "Problem writing mda data";
			delete tmp;
			fclose(outf);
			return false;
		}
		delete tmp;
	}
	else {
		qWarning() << "For now, unable to support this mda type (in save): " << data_type;
		fclose(outf);
		return false;
	}
	
	fclose(outf);
	return true;
}

void mda::operator=(const mda &X) {
	d->copy_from(X);
}
void mda::allocate(int N1,int N2,int N3,int N4) {
	d->allocateFloat32(N1,N2,N3,N4);
}
void mda::allocateUint8(int N1,int N2,int N3,int N4) {
	d->allocateUint8(N1,N2,N3,N4);
}
void mda::allocateFloat32(int N1,int N2,int N3,int N4) {
	d->allocateFloat32(N1,N2,N3,N4);
}
void mda::allocateComplex(int N1,int N2,int N3,int N4) {
	d->allocateComplex(N1,N2,N3,N4);
}
QString mda::dataType() const {
	return d->m_data_type;
}
float mda::getValue(int i1,int i2,int i3,int i4) const {
	long ii=d->get_index1(i1,i2,i3,i4);
	if (ii<0) return 0;
	if (d->m_float32_data) return d->m_float32_data[ii];
	else if (d->m_uint8_data) return d->m_uint8_data[ii];
	else return 0;
}
float mda::getValueImag(int i1,int i2,int i3,int i4) const {
	if (!d->m_float32_imag_data) return 0;
	long ii=d->get_index1(i1,i2,i3,i4);
	if (ii<0) return 0;
	return d->m_float32_imag_data[ii];
}
void mda::setValue(float val,int i1,int i2,int i3,int i4) {
	long ii=d->get_index1(i1,i2,i3,i4);
	if (ii<0) return;
	if (d->m_float32_data) d->m_float32_data[ii]=val;
	else if (d->m_uint8_data) d->m_uint8_data[ii]=(unsigned char)val;
}
void mda::setValueImag(float val,int i1,int i2,int i3,int i4) {
	if (!d->m_float32_data) {
		qWarning() << "Cannot set imaginary part because d->m_float32_data is null.";
		return;
	}
	if (!d->m_NN) {
		qWarning() << "Cannot set imaginary part because d->m_NN is zero.";
		return;
	}
	if (!d->m_float32_imag_data) {
		d->m_float32_imag_data=new float[d->m_NN];
		for (int i=0; i<d->m_NN; i++) d->m_float32_imag_data[i]=0;
	}
	long ii=d->get_index1(i1,i2,i3,i4);
	if (ii<0) return;
	d->m_float32_imag_data[ii]=val;
}
int mda::N1() const {
	return d->m_N1;
}
int mda::N2() const {
	return d->m_N2;
}
int mda::N3() const {
	return d->m_N3;
}
int mda::N4() const {
	return d->m_N4;
}
void *mda::data() {
	if (d->m_float32_data) return d->m_float32_data;
	if (d->m_uint8_data) return d->m_uint8_data;
	return 0;
}
void *mda::dataImag() {
	if (d->m_float32_imag_data) return d->m_float32_imag_data;
	return 0;
}
