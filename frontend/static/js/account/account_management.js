// Login function for integration
function performLogin(username, password) {
  showLoading('Logging in...', autoclose=false);
  $.ajax({
    url: '/backend/account/api/login/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username: username, password: password }),
    headers: {
      'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
    },
    success: function(response) {
      showLoading(response.message, autoclose=true);
      if (response.redirect_url) {
        window.location.href = response.redirect_url;
      }
      console.log('Login successfully', response);
    },
    error: function(error) {
      showLoading(error.responseJSON.message, autoclose=true);
      $('#error_alert').text(error.responseJSON.message).addClass('alert alert-danger').show();
      console.log('Login failed', error);
    }
  });
}

// Register function for integration
function performRegister(firstName, lastName, username, email, password, confirmPassword) {
  // Validate email format
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showLoading('Invalid email format.', autoclose=true);
    $('#registerEmail').css('border', '2px solid red');
    return;
  }
  if (password !== confirmPassword) {
    Swal.fire('Passwords do not match.', '', 'error');
    return;
  }
  showLoading('Registering...', autoclose=false);
  $.ajax({
    url: '/backend/account/api/register/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ firstName: firstName, lastName: lastName, username: username, email: email, password: password, re_password: confirmPassword }),
    success: function(response) {
      showLoadingRegister(response.message, autoclose=true, redirect_url=response.redirect_url);
      console.log('Registration successful', response);
    },
    error: function(error) {
      showLoading(error.responseJSON.error, autoclose=true);
      console.log('Registration failed information', error.responseJSON.error);
    }
  });
}
  $(document).ready(function() {

    var loginPage = "{% url 'login' %}"
    // Handle Login
    $('#login-submit').click(function(e) {
      e.preventDefault();
      var username = $('#loginUsername').val();
      var password = $('#loginPassword').val();

      showLoading('Logging in...', autoclose=false);
      console.log('Attempting login for user:', username);
      
      $.ajax({
        url: '/backend/account/api/login/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, password: password}),
        headers: {
            'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
        },
        success: function(response) {
            showLoading(response.message, autoclose=true);
            if (response.redirect_url) {
                window.location.href = response.redirect_url;
            }
           // Handle success - maybe redirect to a dashboard or show a success message
          console.log('Login successfully', response);
        },
        error: function(error) {
            showLoading(error.responseJSON.message, autoclose=true);
            $('#error_alert').text(error.responseJSON.message).addClass('alert alert-danger').show();
          
          // Handle error - show error message to the user
          console.log('username', username);
          console.log('Login failed', error);
        }
      });
    })

    $('#logout-submit').click(function(e) {
       
        showLoading('Log out...', autoclose=false);
        
        $.ajax({
          url: '/backend/account/api/logout/',
          type: 'POST',
          contentType: 'application/json',
          headers: {
              'X-CSRFToken': $('meta[name="csrf-token"]').attr('content')
          },
          success: function(response) {
              showLoading(response.message, autoclose=true);
              window.location.href = '/';
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
        // alert('register')
      e.preventDefault();
      var firstName = $('#registerFirstName').val();
      var lastName = $('#registerLastName').val();
      var username = $('#registerUsername').val();
      var email = $('#registerEmail').val();
      // Validate email format
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showLoading('Invalid email format.', autoclose=true);
        $('#registerEmail').css('border', '2px solid red');
        return;
      }
      var password = $('#registerPassword').val();
      var confirmPassword = $('#confirmPassword').val();
      if(password !== confirmPassword) {
        // Passwords do not match, handle error
        alert('Passwords do not match.');
        return;
      }
      showLoading('Loading...', autoclose=false);
      $.ajax({
        url: '/backend/account/api/register/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ firstName: firstName, lastName: lastName, username: username, email: email, password: password, re_password: confirmPassword}),
        success: function(response) {
          console.log(response.message)
            // showLoading(response.message, autoclose=true);
            showLoadingRegister(response.message, autoclose=true, redirect_url=response.redirect_url);
           // Handle success - maybe redirect to login page or show a success message
          console.log('Registration successful', response);
        },
        error: function(error) {
          showLoading(error.responseJSON.error, autoclose=true);
          // Handle error - show error message to the user
          console.log('Registration failed information', error.responseJSON.error);
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

  $('.forgot-password').click(function(e) {
      e.preventDefault();
      showLoading('Be patient still in progress...', autoclose=true);
    })

  $('#googleSignUpBtn').click(function(e) {
      e.preventDefault();
      showLoading('Be patient still in progress...', autoclose=true);
      // window.location.href = '/account/google/login/';
    });

