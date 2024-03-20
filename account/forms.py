from django import forms
from django.contrib.auth.hashers import check_password
from account.models import User


class LoginForm(forms.Form):
    username = forms.CharField(max_length=64, label='아이디', error_messages={'required': '아이디를 입력하세요'})
    password = forms.CharField(widget=forms.PasswordInput, label='비밀번호', error_messages={'required': '비밀번호를 입력하세요'})

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        password = cleaned_data.get('password')

        if username and password:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.add_error('username', '아이디가 없습니다.')
                return

            if not check_password(password, user.password):
                self.add_error('password', '비밀번호가 틀렸습니다.')
            else:
                self.user_id = user.id
