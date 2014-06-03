#include "qwait.h"

#include <QtGlobal>
#ifdef Q_OS_WIN
#include <windows.h> // for Sleep
#endif
#ifdef Q_OS_UNIX
#include <errno.h>
#include <signal.h>
#include <time.h>
#endif

#include <QCoreApplication>
#include <QTime>

void qSleep(int ms)
{
    if (!ms) return;

#ifdef Q_OS_WIN
    Sleep(uint(ms));
#else
    struct timespec ts = { ms / 1000, (ms % 1000) * 1000 * 1000 };
    nanosleep(&ts, NULL);
#endif
}

void qWait(int ms)
{
    Q_ASSERT(QCoreApplication::instance());

    QTime timer;
    timer.start();
    do {
        QCoreApplication::processEvents(QEventLoop::AllEvents, ms);
        qSleep(10);
    } while (timer.elapsed() < ms);
}
