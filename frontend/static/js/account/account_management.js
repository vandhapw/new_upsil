  $(document).ready(function() {

    var loginPage = "{% url 'login' %}"
    // Handle Login
    $('#login-submit').click(function(e) {
      e.preventDefault();
      var username = $('#login-username').val();
      var password = $('#login-password').val();

      showLoading('Logging in...', autoclose=false);
      
      $.ajax({
        url: '/account/api/login/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, password: password}),
        headers: {
            'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
        },
        success: function(response) {
            showLoading(response.message, autoclose=true);
            window.location.href = '/dashboard/';
          // Handle success - maybe redirect to a dashboard or show a success message
          console.log('Login successfully', response);
        },
        error: function(error) {
            showLoading(error.responseJSON.message, autoclose=true);
            $('#error_alert').text(error.responseJSON.message).addClass('alert alert-danger').show();
          
          // Handle error - show error message to the user
          console.log('Login failed', error);
        }
      });
    })

    $('#logout-submit').click(function(e) {
       
        showLoading('Log out...', autoclose=false);
        
        $.ajax({
          url: '/account/api/logout/',
          type: 'POST',
          contentType: 'application/json',
          headers: {
              'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
          },
          success: function(response) {
              showLoading(response.message, autoclose=true);
              window.location.href = response.redirect_url;
            // Handle success - maybe redirect to a dashboard or show a success message
            // console.log('Logout successfully', response);
          },
          error: function(error) {
              showLoading(error.responseJSON.message, autoclose=true);
              $('#error_alert').text(error.responseJSON.message).addClass('alert alert-danger').show();
            
            // Handle error - show error message to the user
            console.log('Login failed', error);
          }
        });
      })

    // Handle Registration
    $('#register-submit').click(function(e) {
        alert('register')
      e.preventDefault();
      var username = $('#signup-username').val();
      var email = $('#signup-email').val();
      var password = $('#signup-password').val();
      var confirmPassword = $('#signup-confirm-password').val();
      if(password !== confirmPassword) {
        // Passwords do not match, handle error
        alert('Passwords do not match.');
        return;
      }
      $.ajax({
        url: '/account/api/register/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, email: email, password: password, re_password: confirmPassword}),
        success: function(response) {
            showLoading(response.message, autoclose=true);
            window.location.href = response.redirect_url+"?message=Please re-login";
            // $('#error_alert').text('Please re-login').addClass('alert alert-info').show();
          // Handle success - maybe redirect to login page or show a success message
          console.log('Registration successful', response);
        },
        error: function(error) {
          // Handle error - show error message to the user
          console.log('Registration failed', error);
        }
      });
    });

    function getQueryParams(name){
        const urlSearchParams = new URLSearchParams(window.location.search);
        return urlSearchParams.get(name);
    }

    const message = getQueryParams('message');

    if(message){
        $('#error_alert').text(message).addClass('alert alert-info').show();
    }
  });
