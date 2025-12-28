from django.apps import AppConfig
import threading
import os
import logging

logger = logging.getLogger(__name__)

class MonitoringappsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'monitoringapps'

    def ready(self):
        # Prevent double start in dev reload
        if os.environ.get('RUN_MAIN') != 'true':
            return

        # Prevent duplicate thread
        if getattr(self, '_scheduler_started', False):
            return

        from .sn_sensors import schedule_data_fetch

        self._scheduler_started = True

        self.stop_event = threading.Event()

        thread = threading.Thread(
            target=schedule_data_fetch,
            args=(self.stop_event,),
            daemon=True,
            name='sensor-scheduler'
        )
        thread.start()

        logger.info("Sensor scheduler thread started safely")
