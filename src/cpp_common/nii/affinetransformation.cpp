#include "affinetransformation.h"
#include <math.h>
#include <stdio.h>
#include <QDebug>
#include "textfile.h"

class AffineTransformationPrivate {
public:
	AffineTransformation *q;
	float m_matrix[4][4];
	
	void copy_from(const AffineTransformation &X);
};

AffineTransformation::AffineTransformation() 
{
	d=new AffineTransformationPrivate;
	d->q=this;
	setIdentity();
}
AffineTransformation::AffineTransformation(const AffineTransformation &X) {
	d=new AffineTransformationPrivate;
	d->q=this;
	d->copy_from(X);
}

AffineTransformation::~AffineTransformation()
{
	delete d;
}

Pt3f AffineTransformation::map(Pt3f pt) const {
	Pt3f ret;
	ret.x=pt.x*d->m_matrix[0][0]+pt.y*d->m_matrix[0][1]+pt.z*d->m_matrix[0][2]+d->m_matrix[0][3];
	ret.y=pt.x*d->m_matrix[1][0]+pt.y*d->m_matrix[1][1]+pt.z*d->m_matrix[1][2]+d->m_matrix[1][3];
	ret.z=pt.x*d->m_matrix[2][0]+pt.y*d->m_matrix[2][1]+pt.z*d->m_matrix[2][2]+d->m_matrix[2][3];
	return ret;
}
QList<float> invert33(QList<float> &data33) {
	float X1[3][3];
	float X2[3][3];
	int ct=0;
	for (int j=0; j<3; j++)
	for (int i=0; i<3; i++) {
		X1[i][j]=data33[ct];
		ct++;
	}
	
	X2[0][0] = X1[1][1]*X1[2][2] - X1[2][1]*X1[1][2];
	X2[0][1] = X1[0][1]*X1[2][2] - X1[2][1]*X1[0][2];
	X2[0][2] = X1[0][1]*X1[1][2] - X1[1][1]*X1[0][2];
	X2[1][0] = X1[1][0]*X1[2][2] - X1[2][0]*X1[1][2];
	X2[1][1] = X1[0][0]*X1[2][2] - X1[2][0]*X1[0][2];
	X2[1][2] = X1[0][0]*X1[1][2] - X1[1][0]*X1[0][2];
	X2[2][0] = X1[1][0]*X1[2][1] - X1[2][0]*X1[1][1];
	X2[2][1] = X1[0][0]*X1[2][1] - X1[2][0]*X1[0][1];
	X2[2][2] = X1[0][0]*X1[1][1] - X1[1][0]*X1[0][1];
	
	X2[1][0]*=-1; X2[0][1]*=-1; X2[2][1]*=-1; X2[1][2]*=-1;
	
	double det= 	 X1[0][0]*X1[1][1]*X1[2][2] 
				+X1[0][1]*X1[1][2]*X1[2][0] 
				+X1[0][2]*X1[1][0]*X1[2][1] 
				-X1[0][2]*X1[1][1]*X1[2][0] 
				-X1[0][0]*X1[1][2]*X1[2][1] 
				-X1[0][1]*X1[1][0]*X1[2][2] ;
	if (det!=0) {
		for (int j=0; j<3; j++)
		for (int i=0; i<3; i++)
			X2[i][j]/=det;
	}
	
	QList<float> ret;
	for (int j=0; j<3; j++)
	for (int i=0; i<3; i++) {
		ret << X2[i][j];
	}
	return ret;
}
AffineTransformation AffineTransformation::inverted() const {
	QList<float> data33;
	for (int j=0; j<3; j++)
	for (int i=0; i<3; i++)
		data33 << d->m_matrix[i][j];
	data33=invert33(data33);
	
	float tmp[4][4];
	int ct=0;
	for (int j=0; j<3; j++)
	for (int i=0; i<3; i++) {
		tmp[i][j]=data33[ct]; 
		ct++;
	}
	tmp[0][3]=-(tmp[0][0]*d->m_matrix[0][3]+tmp[0][1]*d->m_matrix[1][3]+tmp[0][2]*d->m_matrix[2][3]);
	tmp[1][3]=-(tmp[1][0]*d->m_matrix[0][3]+tmp[1][1]*d->m_matrix[1][3]+tmp[1][2]*d->m_matrix[2][3]);
	tmp[2][3]=-(tmp[2][0]*d->m_matrix[0][3]+tmp[2][1]*d->m_matrix[1][3]+tmp[2][2]*d->m_matrix[2][3]);
	tmp[3][0]=0; tmp[3][1]=0; tmp[3][2]=0; tmp[3][3]=1;
	AffineTransformation ret;
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		ret.setMatrixValue(tmp[i][j],i,j);
	}
	
	return ret;
}
void AffineTransformation::translate(Pt3f pt) {
	translate(pt.x,pt.y,pt.z);
}
void AffineTransformation::translate(float dx,float dy,float dz) {
	d->m_matrix[0][3]+=dx;
	d->m_matrix[1][3]+=dy;
	d->m_matrix[2][3]+=dz;
}
void AffineTransformation::scale(Pt3f factor) {
	scale(factor.x,factor.y,factor.z);
}
void AffineTransformation::scale(float sx,float sy,float sz) {
	for (int j=0; j<4; j++) {
		d->m_matrix[0][j]*=sx;
		d->m_matrix[1][j]*=sy;
		d->m_matrix[2][j]*=sz;
	}
}
void AffineTransformation::scaleLeft(float sx,float sy,float sz) {
	for (int j=0; j<4; j++) {
		d->m_matrix[0][j]*=sx;
		d->m_matrix[1][j]*=sy;
		d->m_matrix[2][j]*=sz;
	}
}
void AffineTransformation::scaleRight(float sx,float sy,float sz) {
	for (int j=0; j<4; j++) {
		d->m_matrix[j][0]*=sx;
		d->m_matrix[j][1]*=sy;
		d->m_matrix[j][2]*=sz;
	}
}
void AffineTransformation::xRotate(float deg) {
	double alpha=cos(deg*PI/180);
	double beta=sin(deg*PI/180);
	for (int j=0; j<4; j++) {
		double x=d->m_matrix[1][j];
		double y=d->m_matrix[2][j];
		d->m_matrix[1][j]=x*alpha-y*beta;
		d->m_matrix[2][j]=x*beta+y*alpha;
	}
}
void AffineTransformation::yRotate(float deg) {
	double alpha=cos(deg*PI/180);
	double beta=sin(deg*PI/180);
	for (int j=0; j<4; j++) {
		double x=d->m_matrix[2][j];
		double y=d->m_matrix[0][j];
		d->m_matrix[2][j]=x*alpha-y*beta;
		d->m_matrix[0][j]=x*beta+y*alpha;
	}
}
void AffineTransformation::zRotate(float deg) {
	double alpha=cos(deg*PI/180);
	double beta=sin(deg*PI/180);
	for (int j=0; j<4; j++) {
		double x=d->m_matrix[0][j];
		double y=d->m_matrix[1][j];
		d->m_matrix[0][j]=x*alpha-y*beta;
		d->m_matrix[1][j]=x*beta+y*alpha;
	}
}
void AffineTransformation::setIdentity() {
	for (int j=0; j<4; j++)
	for (int i=0; i<4; i++) {
		if (i==j) d->m_matrix[i][j]=1;
		else d->m_matrix[i][j]=0;
	}
}
void AffineTransformation::operator=(const AffineTransformation &X) {
	d->copy_from(X);
}
void AffineTransformationPrivate::copy_from(const AffineTransformation &X) {
	for (int j=0; j<4; j++)
	for (int i=0; i<4; i++) {
		m_matrix[i][j]=X.d->m_matrix[i][j];
	}
}
void AffineTransformation::display() const {
	for (int i=0; i<4; i++) {
		for (int j=0; j<4; j++) {
			printf("%.4f\t ",d->m_matrix[i][j]);
		}
		printf("\n");
	}
}
QString AffineTransformation::displayText() const {
	QString ret;
	for (int i=0; i<4; i++) {
		for (int j=0; j<4; j++) {
			ret+=QString("%1 ").arg(d->m_matrix[i][j],8,'f',-1);
		}
		ret+="\n";
	}
	return ret;
}
void AffineTransformation::leftComposeWith(const AffineTransformation &T) {
	float ret_matrix[4][4];
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		float val=0;
		for (int k=0; k<4; k++) {
			val+=T.d->m_matrix[i][k]*d->m_matrix[k][j];
		}
		ret_matrix[i][j]=val;
	}
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		d->m_matrix[i][j]=ret_matrix[i][j];
	}
}
bool AffineTransformation::isIdentity() const {
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		if (i==j) {if (d->m_matrix[i][j]!=1) return false;}
		else {if (d->m_matrix[i][j]!=0) return false;}
	}
	return true;
}
bool AffineTransformation::isNull() const {
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		if ((i!=3)||(j!=3))
			if (d->m_matrix[i][j]!=0) return false;
	}
	return true;
}
bool AffineTransformation::operator==(const AffineTransformation &X) {
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		if (d->m_matrix[i][j]!=X.d->m_matrix[i][j]) return false;
	}
	return true;
}
QStringList AffineTransformation::toStringList(bool row_major) const {
	if (!row_major) {
		QStringList ret;
		for (int j=0; j<4; j++)
		for (int i=0; i<4; i++) {
			ret << QString("%1").arg(d->m_matrix[i][j]);
		}
		return ret;
	}
	else {
		QStringList ret;
		for (int i=0; i<4; i++)
		for (int j=0; j<4; j++) {
			ret << QString("%1").arg(d->m_matrix[i][j]);
		}
		return ret;
	}
}
void AffineTransformation::fromStringList(const QStringList &L,bool row_major) {
	if (!row_major) {
		int ct=0;
		for (int j=0; j<4; j++) 
		for (int i=0; i<4; i++) {
			d->m_matrix[i][j]=L.value(ct).toDouble();
			ct++;
		}
	}
	else {
		int ct=0;
		for (int i=0; i<4; i++)
		for (int j=0; j<4; j++) {
			d->m_matrix[i][j]=L.value(ct).toDouble();
			ct++;
		}
	}
}
AffineTransformation AffineTransformation::operator*(const AffineTransformation &X) const {
	AffineTransformation ret;
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		double val=0;
		for (int k=0; k<4; k++) {
			val+=d->m_matrix[i][k]*X.d->m_matrix[k][j];
		}
		ret.d->m_matrix[i][j]=val;
	}
	return ret;
}
float AffineTransformation::getMatrixValue(int i,int j) const {
	return d->m_matrix[i][j];
}
void AffineTransformation::setMatrixValue(float val,int i,int j) {
	d->m_matrix[i][j]=val;
}
void AffineTransformation::loadFromTextFile(QString fname) {
	QString txt=read_text_file(fname);
	QStringList lines=txt.split("\n");
	for (int i=0; i<4; i++) {
		QStringList row=lines.value(i).split(" ",QString::SkipEmptyParts);
		for (int j=0; j<4; j++) 
			setMatrixValue(row.value(j).toDouble(),i,j);
	}
}
void AffineTransformation::saveToTextFile(QString fname) {
	QString txt;
	for (int i=0; i<4; i++) {
		txt+=QString("%1  %2  %3  %4\n")
				.arg(getMatrixValue(i,0))
				.arg(getMatrixValue(i,1))
				.arg(getMatrixValue(i,2))
				.arg(getMatrixValue(i,3));
	}
	write_text_file(fname,txt);
}
QString AffineTransformation::toText() const {
	QString txt;
	for (int i=0; i<4; i++) {
		txt+=QString("(%1  %2  %3  %4)  ")
				.arg(getMatrixValue(i,0))
				.arg(getMatrixValue(i,1))
				.arg(getMatrixValue(i,2))
				.arg(getMatrixValue(i,3));
	}
	return txt;
}

Pt3f pt3f(float x,float y,float z) {
	Pt3f ret;
	ret.x=x; ret.y=y; ret.z=z;
	return ret;
}

bool operator==(const Pt3f &P1,const Pt3f &P2) {
	return ((P1.x==P2.x)&&(P1.y==P2.y)&&(P1.z==P2.z));
}
Pt3f operator+(const Pt3f &P1,const Pt3f &P2) {
	return pt3f(P1.x+P2.x,P1.y+P2.y,P1.z+P2.z);
}
Pt3f operator-(const Pt3f &P1,const Pt3f &P2) {
	return pt3f(P1.x-P2.x,P1.y-P2.y,P1.z-P2.z);
}
Pt3f operator*(const Pt3f &P,float val) {
	return pt3f(P.x*val,P.y*val,P.z*val);
}
Pt3f operator/(const Pt3f &P,float val) {
	return pt3f(P.x/val,P.y/val,P.z/val);
}
float magnitude(const Pt3f &P) {
	return sqrt(P.x*P.x+P.y*P.y+P.z*P.z);
}
