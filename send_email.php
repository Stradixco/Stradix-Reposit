<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // استلام البيانات من النموذج
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $subject = htmlspecialchars($_POST['subject']);
    $message = htmlspecialchars($_POST['message']);
    
    // بريدك الإلكتروني لاستقبال الرسائل
    $to = "sales@tradexgroupco.com"; // استبدل هذا بالبريد الإلكتروني الذي تريد استقبال الرسائل عليه
    $headers = "From: $email" . "\r\n" .
               "Reply-To: $email" . "\r\n" .
               "Content-Type: text/html; charset=UTF-8";
    
    // إعداد موضوع الرسالة
    $email_subject = "New Contact Form Submission: $subject";
    
    // محتوى الرسالة
    $email_body = "<h2>New Contact Form Submission</h2>" .
                  "<p><strong>Name:</strong> $name</p>" .
                  "<p><strong>Email:</strong> $email</p>" .
                  "<p><strong>Phone:</strong> $phone</p>" .
                  "<p><strong>Subject:</strong> $subject</p>" .
                  "<p><strong>Message:</strong><br>$message</p>";
    
     // إرسال البريد الإلكتروني
     if (mail($to, $email_subject, $email_body, $headers)) {
        // إذا تم الإرسال بنجاح، توجيه العميل إلى صفحة شكر
        echo "<script>
                alert('Thank you! Your message has been sent.');
                window.location.href = 'contact.html';
              </script>";
    } else {
        echo "<p style='color:red;'>Sorry, something went wrong. Please try again later.</p>";
    }
}
?>

