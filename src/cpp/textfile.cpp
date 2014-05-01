#include "textfile.h"
#include <QFile>
#include <QTextStream>
#include <QSettings>

QString read_text_file(const QString & fname) {
	QFile file(fname);
	if (!file.open(QIODevice::ReadOnly|QIODevice::Text))
		return QString();
	QTextStream ts(&file);
	QString ret = ts.readAll();
	file.close();
	return ret;
}

bool write_text_file(const QString & fname,const QString &txt) {
	QFile file(fname);
	if (!file.open(QIODevice::WriteOnly|QIODevice::Text))
		return false;
	QTextStream ts(&file);
	ts << txt;
	ts.flush();
	file.close();
	return true;
}



