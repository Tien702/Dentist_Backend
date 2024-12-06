require("dotenv").config();
import nodemailer from "nodemailer";

let sendSimpleEmail = async (dataSend) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_APP,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  let info = await transporter.sendMail({
    from: '"Thông Báo - Nha Khoa Minh Tiến" <minhtienb445@gmail.com>',
    to: dataSend.receiverEmail,
    subject: "Thông tin đặt lịch khám bệnh",
    html: `
                <h3>Xin chào ${dataSend.patientName}!</h3>
                <p>Bạn nhận được email này vì đã đặt lịch khám bệnh online trên Nha Khoa Minh Tiến!!!</p>
                <p>Thông tin đặt lịch khám bệnh: </p>
                <div><b>Thời gian: ${dataSend.time}</b></div>
                <div><b>Bác Sĩ: ${dataSend.doctorName}</b></div>

                <p>Nếu các thông tin trên là đúng sự thật, vui lòng nhấn vào link bên dưới
                    để xác nhận và hoàn tất thủ tục đặt lịch khám.
                </p>
                <div>
                    <a href=${dataSend.redirectLink} target="_blank">Xác Nhận</a>
                </div>

                <div>
                    Xin chân thành cảm ơn!!!
                </div>
            `,
  });
};

let sendAttachment = async (dataSend) => {
  return new Promise(async (resolve, reject) => {
    try {
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_APP,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      let info = await transporter.sendMail({
        from: '"Thông Báo - Nha Khoa Minh Tiến" <minhtienb445@gmail.com>',
        to: dataSend.email,
        subject: "Kết quả khám bệnh",
        attachments: [
          {
            filename: `remedy-${
              dataSend.patientId
            }-${new Date().getTime()}.png`,
            content: dataSend.imgBase64.split("base64, ")[1],
            encoding: "base64",
          },
        ],
        html: `
                        <h3>Xin chào ${dataSend.patientName}!</h3>
                        <p>Bạn nhận được email này vì đã khám bệnh thành công!!!</p>
                        <p>
                        Thông tin đơn thuốc/hóa đơn được gửi trong file đính kèm bên dưới!!!
                        </p>
                        <div>
                            Xin chân thành cảm ơn!!!
                        </div>
                    `,
      });

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
module.exports = {
  sendSimpleEmail: sendSimpleEmail,
  sendAttachment: sendAttachment,
};
