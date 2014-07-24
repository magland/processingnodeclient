/****************************************************************************
Automatically generated by WISDM
****************************************************************************/
#include "textfile.h"
#include <QCoreApplication>
#include <QFile>
#include <QDateTime>
#include "mda.h"
#include "qwait.h"
#include "qjson.h"
#include "to_list.h"
#include <math.h>

//includes
$includes$
//////////

int main(int argc, char *argv[])
{
	QCoreApplication app(argc, argv);
	
	try {

$initialization$

$script$

$finalization$

		write_text_file("status.txt",QString("finished:%1").arg(QDateTime::currentDateTime().toString("yyyy-MM-dd-hh-mm-ss-zzz")));
		QFile::remove("running.txt");
	}
	catch (...) {
		write_text_file("status.txt","Caught an exception!");
		QFile::remove("running.txt");
	}

	return 0;
}
