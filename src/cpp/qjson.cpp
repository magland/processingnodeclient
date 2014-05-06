#include "qjson.h"

#include "parser.h"
#include "serializer.h"
#include <QDebug>
#include <QMap>
#include <QVariant>
#include <QStringList>

QVariant convert_variantlists_to_stringlists(const QVariant &X) {
	if (X.type()==QVariant::Map) {
		QMap<QString,QVariant> Y=X.toMap();
		QStringList keys=Y.keys();
		foreach (QString key,keys) {
			Y[key]=convert_variantlists_to_stringlists(Y[key]);
		}
		return Y;
	}
	else if (X.type()==QVariant::List) {
		QList<QVariant> Y=X.toList();
		bool all_strings=true;
		for (int i=0; i<Y.count(); i++) {
			if (Y[i].type()!=QVariant::String) all_strings=false;
		}
		if (!all_strings) {
			for (int i=0; i<Y.count(); i++) {
				Y[i]=convert_variantlists_to_stringlists(Y[i]);
			}
			return Y;
		}
		else {
			QStringList Z;
			for (int i=0; i<Y.count(); i++) {
				Z << Y[i].toString();
			}
			return Z;
		}		
	}
	else {
		return X;
	}
}


QVariant parseJSON(const QString &txt) {
	QJson::Parser parser;
	bool ok;
	QVariant result=parser.parse(txt.toAscii(),&ok);
	return convert_variantlists_to_stringlists(result);
	/*if (ok) return result.toMap();
	else return QMap<QString,QVariant>();*/
}

QVariant convert_stringlists_to_variantlists(const QVariant &X) {
	if (X.type()==QVariant::Map) {
		QMap<QString,QVariant> Y=X.toMap();
		QStringList keys=Y.keys();
		foreach (QString key,keys) {
			Y[key]=convert_stringlists_to_variantlists(Y[key]);
		}
		return Y;
	}
	else if (X.type()==QVariant::List) {
		QList<QVariant> Y=X.toList();
		for (int i=0; i<Y.count(); i++) {
			Y[i]=convert_stringlists_to_variantlists(Y[i]);
		}
		return Y;
	}
	else if (X.type()==QVariant::StringList) {
		QStringList Y=X.toStringList();
		QList<QVariant> Z;
		for (int i=0; i<Y.count(); i++) Z << Y[i];
		return Z;
	}
	else {
		return X;
	}
}

QString toJSON(const QVariant &map_or_list) {
	QVariant tmp=convert_stringlists_to_variantlists(map_or_list);
	QJson::Serializer serializer;
	return serializer.serialize(tmp);
}
QByteArray toJSON_bytearray(const QVariant &map_or_list) {
	QVariant tmp=convert_stringlists_to_variantlists(map_or_list);
	QJson::Serializer serializer;
	return serializer.serialize(tmp);
}

