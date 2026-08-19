"""Production must not silently fall back to per-process LocMem / InMemory layers."""

from django.test import SimpleTestCase

from shop.settings import assert_production_shared_cache


REDIS_CACHE = 'django.core.cache.backends.redis.RedisCache'
LOCMEM_CACHE = 'django.core.cache.backends.locmem.LocMemCache'
REDIS_CHANNELS = 'channels_redis.core.RedisChannelLayer'
MEMORY_CHANNELS = 'channels.layers.InMemoryChannelLayer'


class ProductionRedisConfigTests(SimpleTestCase):
    def test_debug_allows_locmem_and_inmemory_channels(self):
        assert_production_shared_cache(
            debug=True,
            cache_backend=LOCMEM_CACHE,
            channel_backend=MEMORY_CHANNELS,
            realtime_enabled=True,
        )

    def test_tests_may_allow_inprocess_backends(self):
        assert_production_shared_cache(
            debug=False,
            cache_backend=LOCMEM_CACHE,
            channel_backend=MEMORY_CHANNELS,
            realtime_enabled=True,
            allow_inprocess=True,
        )

    def test_production_rejects_locmem_cache(self):
        with self.assertRaises(RuntimeError) as captured:
            assert_production_shared_cache(
                debug=False,
                cache_backend=LOCMEM_CACHE,
                channel_backend=REDIS_CHANNELS,
                realtime_enabled=True,
            )
        self.assertIn('REDIS_URL', str(captured.exception))
        self.assertIn('send-budget', str(captured.exception))

    def test_production_rejects_inmemory_channel_layer(self):
        with self.assertRaises(RuntimeError) as captured:
            assert_production_shared_cache(
                debug=False,
                cache_backend=REDIS_CACHE,
                channel_backend=MEMORY_CHANNELS,
                realtime_enabled=True,
            )
        self.assertIn('CHANNELS_REDIS_URL', str(captured.exception))

    def test_production_allows_inmemory_channels_when_realtime_is_off(self):
        assert_production_shared_cache(
            debug=False,
            cache_backend=REDIS_CACHE,
            channel_backend=MEMORY_CHANNELS,
            realtime_enabled=False,
        )

    def test_production_accepts_redis_for_cache_and_channels(self):
        assert_production_shared_cache(
            debug=False,
            cache_backend=REDIS_CACHE,
            channel_backend=REDIS_CHANNELS,
            realtime_enabled=True,
        )
