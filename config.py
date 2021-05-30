#!/usr/bin/env python
# -*- coding:utf-8 -*-

class BaseConfig(object):
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = False


class ProductionConfig(BaseConfig):
    pass

class DevelopmentConfig(BaseConfig):
    pass

class TestingConfig(BaseConfig):
    pass

