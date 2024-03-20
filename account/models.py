from django.db import models


class User(models.Model):
    username = models.CharField(max_length=64, verbose_name='아이디')
    user_group = models.CharField(max_length=64, verbose_name='사용자 그룹')
    password = models.CharField(max_length=64, verbose_name='비밀번호')
    email = models.EmailField(max_length=64, verbose_name='이메일')
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name='가입일자')

    class Meta:
        db_table = 'user'
        ordering = ['-registered_at']
        verbose_name = '사용자'
        verbose_name_plural = '사용자'

    def __str__(self):
        return self.username

class UserGroup(models.Model):
    user_group_id = models.CharField(max_length=64, verbose_name='사용자 그룹 아이디')
    user_group = models.CharField(max_length=64, verbose_name='사용자 그룹')
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name='가입일자')

    class Meta:
        db_table = 'user_group'
        ordering = ['-registered_at']
        verbose_name = '사용자 그룹'
        verbose_name_plural = '사용자 그룹'

    def __str__(self):
        return self.username

class UserLog(models.Model):
    username = models.ForeignKey("User", on_delete=models.CASCADE, db_column="username", verbose_name='아이디')
    visitcount = models.FloatField(null=True, verbose_name='방문횟수')                  # 방문횟수
    login_at = models.DateTimeField(auto_now_add=True, verbose_name='로그인 일시')       # 로그인 일시
    logout_at = models.DateTimeField(auto_now_add=True, verbose_name='로그아웃 일시')   # 로그아웃 일시
