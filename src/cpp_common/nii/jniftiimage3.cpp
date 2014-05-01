#include "jniftiimage3.h"

extern "C" {
	#include "niftilib/nifti1_io.h"
}
#include <QFileInfo>
#include <QVariant>
#include <QDir>
#include <QTime>
#include <QHash>
#include <QApplication>
#include <QProcess>
#include <QDebug>


class JNiftiImage3Private {
public:
	JNiftiImage3 *q;
	QString m_data_type;
	int m_N1,m_N2,m_N3,m_N4;
	AffineTransformation m_transformation;
	unsigned char *m_data_uchar;
	quint16 *m_data_int16;
	qint32 *m_data_int32;
	qint64 *m_data_int64;
	float *m_data_real32;
	QMap<QString,QVariant> m_header_parameters;
	
	bool internal_allocate(QString data_type,int N1,int N2,int N3,int N4);
	bool set_data(void *ddd);
	void internal_clear();
	
	void copy_from(const JNiftiImage3 &X);
};

void JNiftiImage3Private::copy_from(const JNiftiImage3 &X) {
	internal_allocate(X.d->m_data_type,X.d->m_N1,X.d->m_N2,X.d->m_N3,X.d->m_N4);
	int NN=m_N1*m_N2*m_N3*m_N4;
	if (m_data_type=="uchar") {
		memcpy(m_data_uchar,X.d->m_data_uchar,NN*1);
	}
	else if (m_data_type=="int16") {
		memcpy(m_data_int16,X.d->m_data_int16,NN*2);
	}
	else if (m_data_type=="int32") {
		memcpy(m_data_int32,X.d->m_data_int32,NN*4);
	}
	else if (m_data_type=="int64") {
		memcpy(m_data_int64,X.d->m_data_int64,NN*8);
	}
	else if (m_data_type=="real32") {
		memcpy(m_data_real32,X.d->m_data_real32,NN*4);
	}
	m_header_parameters=X.d->m_header_parameters;
	m_transformation=X.d->m_transformation;
}

JNiftiImage3::JNiftiImage3() 
{
	d=new JNiftiImage3Private;
	d->q=this;
	d->m_N1=d->m_N2=d->m_N3=d->m_N4=0;
	d->m_data_uchar=0;
	d->m_data_int16=0;
	d->m_data_int32=0;
	d->m_data_int64=0;
	d->m_data_real32=0;
}

JNiftiImage3::~JNiftiImage3()
{
	d->internal_clear();
	delete d;
}

JNiftiImage3::JNiftiImage3(const JNiftiImage3 &X) {
	d=new JNiftiImage3Private;
	d->q=this;
	d->m_N1=d->m_N2=d->m_N3=d->m_N4=0;
	d->m_data_uchar=0;
	d->m_data_int16=0;
	d->m_data_int32=0;
	d->m_data_int64=0;
	d->m_data_real32=0;
	d->copy_from(X);
}
void JNiftiImage3::operator=(const JNiftiImage3 &X) {
	d->copy_from(X);
}


QString to_string(mat44 &M) {
	QString ret;
	ret+=QString("%1,%2,%3,%4;  ").arg(M.m[0][0]).arg(M.m[0][1]).arg(M.m[0][2]).arg(M.m[0][3]);
	ret+=QString("%1,%2,%3,%4;  ").arg(M.m[1][0]).arg(M.m[1][1]).arg(M.m[1][2]).arg(M.m[1][3]);
	ret+=QString("%1,%2,%3,%4;  ").arg(M.m[2][0]).arg(M.m[2][1]).arg(M.m[2][2]).arg(M.m[2][3]);
	ret+=QString("%1,%2,%3,%4;  ").arg(M.m[3][0]).arg(M.m[3][1]).arg(M.m[3][2]).arg(M.m[3][3]);
	return ret;
}
QChar make_random_alphanumeric_niftiimage3() {
	static int val=0;
	val++;
	QTime time=QTime::currentTime();
	int num=qHash(time.toString("hh:mm:ss:zzz")+QString::number(qrand()+val));
	num=num%36;
	if (num<26) return QChar('A'+num);
	else return QChar('0'+num-26);
}

/*
QString make_random_id_niftiimage3(int char_count) {
	QString ret;
	for (int i=0; i<char_count; i++) {
		ret.append(make_random_alphanumeric_niftiimage3());
	}
	return ret;
}

QChar make_random_alphanumeric_workingdir_78() {
	static int val=0;
	val++;
	QTime time=QTime::currentTime();
	int num=qHash(time.toString("hh:mm:ss:zzz")+QString::number(qrand()+val));
	num=num%36;
	if (num<26) return QChar('A'+num);
	else return QChar('0'+num-26);
}
QString make_random_id_workingdir_78(int char_count) {
	QString ret;
	for (int i=0; i<char_count; i++) {
		ret.append(make_random_alphanumeric_workingdir_78());
	}
	return ret;
}


QString create_working_dir_78() {
	QString tmp="tmp-"+make_random_id_workingdir_78(10);
	QDir(QDir::tempPath()).mkdir(tmp);
	return QDir::tempPath()+"/"+tmp;
}
void clear_working_dir_78(const QString &dirname) {
	if (QFileInfo(dirname).fileName().indexOf("tmp-")!=0) return; //for safety
	QStringList list=QDir(dirname).entryList(QStringList("*"),QDir::Files,QDir::Name);
	foreach (QString str,list) {
		QFile::remove(dirname+"/"+str);
	}
	QDir(QFileInfo(dirname).path()).rmdir(QFileInfo(dirname).fileName());
}
*/


bool JNiftiImage3::read(QString nii_fname,bool load_data) {
	#ifdef WIN32
	nii_fname.replace("/","\\");
	#endif
	
	QString suf=QFileInfo(nii_fname).suffix();
	/*if (suf=="dcm") {
		QString tmp_dirname=create_working_dir_78();
		QFile::copy(nii_fname,tmp_dirname+"/input.dcm");
		QString exe=qApp->applicationDirPath()+"/dcm2nii.exe";
		QStringList args; args << "-d" << "n" << "-e" << "n" << "-f" << "y" << "-g" << "n" << "-i" << "n" << "-p" << "n" << tmp_dirname;
		QProcess::execute(exe,args);
		bool ret=read(tmp_dirname+"/input.nii");
		clear_working_dir_78(tmp_dirname);
		return ret;
	}*/
	
	/*
	if (suf=="gz") {
		#ifdef WIN32
		return false;
		#endif
		QString tmp_fname=QDir::tempPath()+"/"+make_random_id_niftiimage3(10)+".nii";
		QFile::copy(nii_fname,tmp_fname+".gz");
		QString exe="/bin/gunzip";
		QStringList args; args << tmp_fname+".gz";
		QProcess::execute(exe,args);
		qSleep(10); //not sure if necessary -- but we suspect that this might help ensure that the entire image is available for reading.
		bool ret0=read(tmp_fname);
		QFile::remove(tmp_fname);
		QFile::remove(tmp_fname+".gz");
		return ret0;
	}
	*/
	
	
	nifti_image *img=nifti_image_read(nii_fname.toAscii().data(),load_data);
	if (!img) return false;
	
	d->m_header_parameters["ndim"]=img->ndim;
	d->m_header_parameters["nx"]=img->nx;
	d->m_header_parameters["ny"]=img->ny;
	d->m_header_parameters["nz"]=img->nz;
	d->m_header_parameters["nt"]=img->nt;
	d->m_header_parameters["nu"]=img->nu;
	d->m_header_parameters["nv"]=img->nv;
	d->m_header_parameters["nw"]=img->nw;
	d->m_header_parameters["nbyper"]=img->nbyper;
	d->m_header_parameters["datatype"]=img->datatype;
	d->m_header_parameters["dx"]=img->dx;
	d->m_header_parameters["dy"]=img->dy;
	d->m_header_parameters["dz"]=img->dz;
	d->m_header_parameters["dt"]=img->dt;
	d->m_header_parameters["du"]=img->du;
	d->m_header_parameters["dv"]=img->dv;
	d->m_header_parameters["dw"]=img->dw;
	d->m_header_parameters["scl_slope"]=img->scl_slope;
	d->m_header_parameters["scl_inter"]=img->scl_inter;
	d->m_header_parameters["cal_min"]=img->cal_min;
	d->m_header_parameters["cal_max"]=img->cal_max;
	d->m_header_parameters["qform_code"]=img->qform_code;
	d->m_header_parameters["sform_code"]=img->sform_code;
	d->m_header_parameters["freq_dim"]=img->freq_dim;
	d->m_header_parameters["phase_dim"]=img->phase_dim;
	d->m_header_parameters["slice_dim"]=img->slice_dim;
	d->m_header_parameters["slice_code"]=img->slice_code;
	d->m_header_parameters["slice_start"]=img->slice_start;
	d->m_header_parameters["slice_end"]=img->slice_end;
	d->m_header_parameters["slice_duration"]=img->slice_duration;
	d->m_header_parameters["quatern_b"]=img->quatern_b;
	d->m_header_parameters["quatern_c"]=img->quatern_c;
	d->m_header_parameters["quatern_d"]=img->quatern_d;
	d->m_header_parameters["qoffset_x"]=img->qoffset_x;
	d->m_header_parameters["qoffset_y"]=img->qoffset_y;
	d->m_header_parameters["qoffset_z"]=img->qoffset_z;
	d->m_header_parameters["qfac"]=img->qfac;
	d->m_header_parameters["qto_xyz"]=to_string(img->qto_xyz);
	d->m_header_parameters["qto_ijk"]=to_string(img->qto_ijk);
	d->m_header_parameters["sto_xyz"]=to_string(img->sto_xyz);
	d->m_header_parameters["sto_ijk"]=to_string(img->sto_ijk);
	d->m_header_parameters["toffset"]=img->toffset;
	d->m_header_parameters["xyz_units"]=img->xyz_units;
	d->m_header_parameters["time_units"]=img->time_units;
	d->m_header_parameters["nifti_type"]=img->nifti_type;
	d->m_header_parameters["intent_code"]=img->intent_code;
	d->m_header_parameters["intent_p1"]=img->intent_p1;
	d->m_header_parameters["intent_p2"]=img->intent_p2;
	d->m_header_parameters["intent_p3"]=img->intent_p3;
	d->m_header_parameters["intent_name"]=img->intent_name;
	d->m_header_parameters["descrip"]=img->descrip;
	d->m_header_parameters["aux_file"]=img->aux_file;
	d->m_header_parameters["swapsize"]=img->swapsize;
	d->m_header_parameters["byteorder"]=img->byteorder;
	d->m_header_parameters["num_ext"]=img->num_ext;
	d->m_header_parameters["analyze_75_orient"]=img->analyze75_orient;
	
	
	bool ret=true;
	int N1=1; if (img->ndim>=1) N1=img->dim[1];
	int N2=1; if (img->ndim>=2) N2=img->dim[2];
	int N3=1; if (img->ndim>=3) N3=img->dim[3];
	int N4=1; if (img->ndim>=4) N4=img->dim[4];
	int nbyper,swapsize;
	nifti_datatype_sizes(img->datatype,&nbyper,&swapsize);
	d->m_data_type="";
	if (nifti_is_inttype(img->datatype)) {
		if (nbyper==1) {
			d->m_data_type="uchar";
		}
		else if (nbyper==2) {
			d->m_data_type="int16";
		}
		else if (nbyper==4) {
			d->m_data_type="int32";
		}
		else if (nbyper==8) {
			d->m_data_type="int64";
		}
		else ret=false;
	}
	else {
		if (img->datatype==DT_FLOAT32) {
			d->m_data_type="real32";
		}
		else ret=false;
	}
	if ((ret)&&(load_data)) {
		if (d->internal_allocate(d->m_data_type,N1,N2,N3,N4)) {
			d->set_data(img->data);
		
			AffineTransformation T;
			QList<float> vals;
			vals << img->sto_xyz.m[0][0] << img->sto_xyz.m[0][1] << img->sto_xyz.m[0][2] << img->sto_xyz.m[0][3]; 
			vals << img->sto_xyz.m[1][0] << img->sto_xyz.m[1][1] << img->sto_xyz.m[1][2] << img->sto_xyz.m[1][3];
			vals << img->sto_xyz.m[2][0] << img->sto_xyz.m[2][1] << img->sto_xyz.m[2][2] << img->sto_xyz.m[2][3];
			vals << 0 << 0 << 0 << 1;
			if ((vals[0]==0)&&(vals[1]==0)&&(vals[2]==0)) {
				vals.clear();
				vals << 
					img->dx << 0 << 0 << 0 << 
					0 << img->dy << 0 << 0 << 
					0 << 0 << img->dz << 0 << 
					0 << 0 << 0 << 1;
			}
			
			int ct=0;
			for (int r=0; r<4; r++)
			for (int c=0; c<4; c++) {
				T.setMatrixValue(vals[ct],r,c);
				ct++;
			}
			
			d->m_transformation=T;
		}
		else ret=false;
	}
	else ret=false;
	nifti_image_unload(img);
	nifti_image_free(img);
	return ret;
}
void set_identity2(mat44 &M) {
	for (int i=0; i<4; i++)
	for (int j=0; j<4; j++) {
		if (i==j) M.m[i][j]=1;
		else M.m[i][j]=0;
	}
}
float get_dx(const AffineTransformation &T) {
	Pt3f pt0=pt3f(0,0,0);
	Pt3f pt1=pt3f(1,0,0);
	Pt3f tmp=T.map(pt1)-T.map(pt0);
	return sqrt(tmp.x*tmp.x+tmp.y*tmp.y+tmp.z*tmp.z);
}
float get_dy(const AffineTransformation &T) {
	Pt3f pt0=pt3f(0,0,0);
	Pt3f pt1=pt3f(0,1,0);
	Pt3f tmp=T.map(pt1)-T.map(pt0);
	return sqrt(tmp.x*tmp.x+tmp.y*tmp.y+tmp.z*tmp.z);
}
float get_dz(const AffineTransformation &T) {
	Pt3f pt0=pt3f(0,0,0);
	Pt3f pt1=pt3f(0,0,1);
	Pt3f tmp=T.map(pt1)-T.map(pt0);
	return sqrt(tmp.x*tmp.x+tmp.y*tmp.y+tmp.z*tmp.z);
}
bool JNiftiImage3::write(QString nii_fname) {
	bool ok=false;
	if ((d->m_data_type=="uchar")||(d->m_data_type=="int16")||(d->m_data_type=="real32")) ok=true;
	if (!ok) {
		qWarning() << "Unsupported data format for writing:" << d->m_data_type;
		return false;
	}
	nifti_image *img=(nifti_image *)calloc( 1 , sizeof(nifti_image) );
	img->ndim=4;
	img->dim[0]=img->ndim;
	for (int i=0; i<7; i++) img->dim[i+1]=1;
	img->dim[1]=d->m_N1; img->dim[2]=d->m_N2; img->dim[3]=d->m_N3; img->dim[4]=d->m_N4;
	img->nx=img->dim[1]; img->ny=img->dim[2]; img->nz=img->dim[3]; 
	img->nt=img->dim[4]; img->nu=img->dim[5]; img->nv=img->dim[6]; img->nw=img->dim[7];
	img->nvox=1;
	for (int i=1; i<=img->ndim; i++) img->nvox*=img->dim[i];
	if (d->m_data_type=="uchar") {
		img->nbyper=1;
		img->datatype=DT_UINT8;
	}
	else if (d->m_data_type=="int16") {
		img->nbyper=2;
		img->datatype=DT_INT16;
	}
	else if (d->m_data_type=="real32") {
		img->nbyper=4;
		img->datatype=DT_FLOAT32;
	}
	img->dx=img->dy=img->dz=img->dt=img->du=img->dv=img->dw=1;
	img->dx=get_dx(d->m_transformation);
	img->dy=get_dy(d->m_transformation);
	img->dz=get_dz(d->m_transformation);	
	for (int i=0; i<8; i++) img->pixdim[i]=1;
	img->pixdim[1]=img->dx;
	img->pixdim[2]=img->dy;
	img->pixdim[3]=img->dz;
	img->pixdim[4]=img->dt;
	
	img->scl_slope=0; img->scl_inter=0;
	img->cal_min=img->cal_max=0;
	img->qform_code=0; img->sform_code=1;
	img->freq_dim=0; img->phase_dim=0; img->slice_dim=0;
	img->slice_code=0; img->slice_start=0; img->slice_end=0; img->slice_duration=0;
	
	img->quatern_b=img->quatern_c=img->quatern_d=0;
	img->qoffset_x=img->qoffset_y=img->qoffset_z=0;
	img->qfac=0;
	
	set_identity2(img->qto_xyz); set_identity2(img->qto_ijk);
	set_identity2(img->sto_xyz); set_identity2(img->sto_ijk);
	AffineTransformation T_inv=d->m_transformation.inverted();
	for (int jj=0; jj<4; jj++)
	for (int ii=0; ii<4; ii++) {
		img->sto_xyz.m[ii][jj]=d->m_transformation.getMatrixValue(ii,jj);
		img->sto_ijk.m[ii][jj]=T_inv.getMatrixValue(ii,jj);
	}
	
	img->toffset=0;
	img->xyz_units=0; img->time_units=0;
	img->nifti_type=1;	
	img->intent_code=0;
	img->intent_p1=img->intent_p2=img->intent_p3=0;
	
	strcpy(img->intent_name,"");
  	strcpy(img->descrip,"");
  	strcpy(img->aux_file,"none");
  	
  	img->fname=0; //is this right?
  	img->iname=0;
  	
  	//hard code these for now
  	img->iname_offset=352; //this is set below, immediately before writing
  	img->swapsize=2;
  	img->byteorder=1; //this is set during nifti_set_filenames, i believe
  	
  	long total_bytes=img->nvox*img->nbyper;
  	img->data=(void *)calloc(1,total_bytes) ;  /* create image memory */
  	{
  		if (img->datatype==DT_INT16) {
  			quint16 *ddd=(quint16 *)img->data;
	  		for (unsigned long ct=0; ct<img->nvox; ct++) {
	  			ddd[ct]=d->m_data_int16[ct];
	  		}
  		}
  		else if (img->datatype==DT_UINT8) {
  			unsigned char *ddd=(unsigned char *)img->data;
	  		for (unsigned long ct=0; ct<img->nvox; ct++) {
	  			ddd[ct]=d->m_data_uchar[ct];
	  		}
  		}
  		else if (img->datatype==DT_FLOAT32) {
  			float *ddd=(float *)img->data;
	  		for (unsigned long ct=0; ct<img->nvox; ct++) {
	  			ddd[ct]=d->m_data_real32[ct];
	  		}
  		}
  	}
  	img->num_ext=0;
  	img->ext_list=0;
  	img->analyze75_orient=a75_transverse_unflipped;
  	
  	QString prefix=QFileInfo(nii_fname).path()+"/"+QFileInfo(nii_fname).completeBaseName();
	#ifdef __WIN32__
	prefix.replace("/","\\");
	#endif
  	nifti_set_filenames(img,prefix.toAscii().data(),0,1);
  	nifti_set_iname_offset(img);
	nifti_image_write(img);
	nifti_image_unload(img);
	nifti_image_free(img);
	return true;
}
int JNiftiImage3::N1() const {
	return d->m_N1;
}
int JNiftiImage3::N2() const {
	return d->m_N2;
}
int JNiftiImage3::N3() const {
	return d->m_N3;
}
int JNiftiImage3::N4() const {
	return d->m_N4;
}
bool JNiftiImage3::allocate(QString data_type,int N1,int N2,int N3,int N4) {
	return d->internal_allocate(data_type,N1,N2,N3,N4);
}
AffineTransformation JNiftiImage3::worldTransformation() const {
	return d->m_transformation;
}
void JNiftiImage3::setWorldTransformation(const AffineTransformation &T) {
	d->m_transformation=T;
}
bool JNiftiImage3Private::internal_allocate(QString data_type,int N1,int N2,int N3,int N4) {
	internal_clear();
	long NN=N1*N2*N3*N4;
	if (!NN) {
		qWarning() << "Unable to allocate nifti image with size zero.";
		return false;
	}
	if (!m_data_type.isEmpty()) {
		qWarning() << "Unable to allocate nifti image more than once!";
		return false;
	}
	m_data_type=data_type;
	m_N1=N1;
	m_N2=N2;
	m_N3=N3;
	m_N4=N4;
	if (data_type=="uchar") {
		m_data_uchar=(unsigned char *)malloc(sizeof(unsigned char)*NN);
		for (long ii=0; ii<NN; ii++) m_data_uchar[ii]=0;
	}
	else if (data_type=="int16") {
		m_data_int16=(quint16 *)malloc(sizeof(quint16)*NN);
		for (long ii=0; ii<NN; ii++) m_data_int16[ii]=0;
	}
	else if (data_type=="int32") {
		m_data_int32=(qint32 *)malloc(sizeof(qint32)*NN);
		for (long ii=0; ii<NN; ii++) m_data_int32[ii]=0;
	}
	else if (data_type=="int64") {
		m_data_int64=(qint64 *)malloc(sizeof(qint64)*NN);
		for (long ii=0; ii<NN; ii++) m_data_int64[ii]=0;
	}
	else if (data_type=="real32") {
		m_data_real32=(float *)malloc(sizeof(float)*NN);
		for (long ii=0; ii<NN; ii++) m_data_real32[ii]=0;
	}
	else return false;
	return true;
}
bool JNiftiImage3Private::set_data(void *ddd) {
	long NN=m_N1*m_N2*m_N3*m_N4;
	if (m_data_type=="uchar") {
		unsigned char *dddd=(unsigned char *)ddd;
		for (long ii=0; ii<NN; ii++) m_data_uchar[ii]=dddd[ii];
	}
	else if (m_data_type=="int16") {
		quint16 *dddd=(quint16 *)ddd;
		for (long ii=0; ii<NN; ii++) m_data_int16[ii]=dddd[ii];
	}
	else if (m_data_type=="int32") {
		qint32 *dddd=(qint32 *)ddd;
		for (long ii=0; ii<NN; ii++) m_data_int32[ii]=dddd[ii];
	}
	else if (m_data_type=="int64") {
		qint64 *dddd=(qint64 *)ddd;
		for (long ii=0; ii<NN; ii++) m_data_int64[ii]=dddd[ii];
	}
	else if (m_data_type=="real32") {
		float *dddd=(float *)ddd;
		for (long ii=0; ii<NN; ii++) {
			//if (dddd[ii]<0) dddd[ii]=-dddd[ii]; //fixed this bug 8/3/2012
			m_data_real32[ii]=dddd[ii];
		}
	}
	else return false;
	return true;
}
void JNiftiImage3Private::internal_clear() {
	if (m_data_uchar) free(m_data_uchar); m_data_uchar=0;
	if (m_data_int16) free(m_data_int16); m_data_int16=0;
	if (m_data_int32) free(m_data_int32); m_data_int32=0;
	if (m_data_int64) free(m_data_int64); m_data_int64=0;
	if (m_data_real32) free(m_data_real32); m_data_real32=0;
	m_data_type="";
	m_N1=m_N2=m_N3=m_N4=0;
	m_transformation.setIdentity();	
}
void *JNiftiImage3::data() {
	if (d->m_data_type=="uchar") return d->m_data_uchar;
	else if (d->m_data_type=="int16") return d->m_data_int16;
	else if (d->m_data_type=="int32") return d->m_data_int32;
	else if (d->m_data_type=="int64") return d->m_data_int64;
	else if (d->m_data_type=="real32") return d->m_data_real32;
	else return 0;
}
void JNiftiImage3::clear() {
	d->internal_clear();
}
QMap<QString,QVariant> JNiftiImage3::headerParameters() const {
	return d->m_header_parameters;
}
QString JNiftiImage3::dataType() const {
	return d->m_data_type;
}
