#include "to_list.h"
#include <QStringList>

QList<int> to_int_list(const QString &str) {
	QStringList list=str.split(",");
	QList<int> ret;
	for (int i=0; i<list.count(); i++) {
		ret << list[i].toInt();
	}
	return ret;
}

QList<double> to_double_list(const QString &str) {
	QStringList list=str.split(",");
	QList<double> ret;
	for (int i=0; i<list.count(); i++) {
		ret << list[i].toDouble();
	}
	return ret;
}