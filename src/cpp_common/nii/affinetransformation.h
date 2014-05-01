#ifndef affinetransformation_H
#define affinetransformation_H

#include <math.h>
#include <QString>
#include <QStringList>

#ifndef PI
#define PI 3.141592
#endif

struct Pt3f {
	float x,y,z;
};
Pt3f pt3f(float x,float y,float z);
bool operator==(const Pt3f &P1,const Pt3f &P2);
Pt3f operator+(const Pt3f &P1,const Pt3f &P2);
Pt3f operator-(const Pt3f &P1,const Pt3f &P2);
Pt3f operator*(const Pt3f &P,float val);
Pt3f operator/(const Pt3f &P,float val);
float magnitude(const Pt3f &P);

class AffineTransformationPrivate;
class AffineTransformation {
public:
	friend class AffineTransformationPrivate;
	AffineTransformation();
	AffineTransformation(const AffineTransformation &X);
	virtual ~AffineTransformation();
	Pt3f map(Pt3f pt) const;
	AffineTransformation inverted() const;
	void translate(Pt3f pt);
	void translate(float dx,float dy,float dz);
	void scale(Pt3f factor);
	void scale(float sx,float sy,float sz);
	void scaleLeft(float sx,float sy,float sz);
	void scaleRight(float sx,float sy,float sz);
	void xRotate(float deg);
	void yRotate(float deg);
	void zRotate(float deg);
	void setIdentity();
	void leftComposeWith(const AffineTransformation &T);
	float getMatrixValue(int i,int j) const;
	void setMatrixValue(float val,int i,int j);
	void operator=(const AffineTransformation &X);
	void display() const;
	QString displayText() const;
	bool isIdentity() const;
	bool isNull() const;
	bool operator==(const AffineTransformation &X);
	AffineTransformation operator*(const AffineTransformation &X) const;
	QStringList toStringList(bool row_major=true) const;
	void fromStringList(const QStringList &L,bool row_major=true);
	QString toText() const;
	void loadFromTextFile(QString fname);
	void saveToTextFile(QString fname);
private:
	AffineTransformationPrivate *d;
};

#endif
