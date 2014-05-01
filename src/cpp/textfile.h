#ifndef textfile_H
#define textfile_H

#include <QString>

QString read_text_file(const QString &fname);
bool write_text_file(const QString &fname,const QString &txt);

#endif
