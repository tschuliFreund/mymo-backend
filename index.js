const express = require('express')//
const socketIo = require("socket.io");//
const http = require("http");//
const cors = require('cors');//
const sqlite3 = require('sqlite3');//
const path = require('path')//
const dbPath = path.resolve(__dirname, 'database/database.sqlite3')//
const exec = require('child_process').exec;//
const compression = require('compression');//
var bodyParser = require('body-parser')//;
const fs = require("fs"); // 
const multer = require('multer');//
const { promisify } = require("util");//
const pipeline = promisify(require("stream").pipeline);//

//Modules
// var frameGetActiveView = require('./modules/frame/active_view.js')
// var frameGetContrast = require('./modules/frame/get_contrast.js')
// var frameUpdateImage = require('./modules/frame/update_images_spf.js');
// var getActiveImagesUncompressed = require('./modules/frame/active_images_uncompressed.js')
// var getActiveVideo = require('./modules/frame/active_video.js')

const db = new sqlite3.Database(dbPath);

// CORS OPTIONS
const options = {
  cors: true,
  origins: ["*"],
  maxHttpBufferSize: 300000000000000000,
  // wsEngine: 'ws'
}

//Port from environment variable or default - 4001
const port = process.env.PORT || 4000;

//Setting up express and adding socketIo middleware
const app = express();
app.use(compression());
const server = http.createServer(app);
const io = socketIo(server, options);

app.use(cors());
app.use(bodyParser.json({ limit: '600mb' }));
app.use(bodyParser.urlencoded({ limit: '600mb', extended: true, parameterLimit: 1000000000000 }));

//VIEWS :: GET_ACTIVE_VIEW
app.get('/all_views', function (req, res) {
  var resultArray = [];
  db.each("SELECT * FROM Views",
    (error, result) => {
      resultArray.push(result)
      if (resultArray.length == 4) {
        res.send(resultArray);
      }
    }
  );
})

//VIEWS: CHANGE_VIEW
app.post('/change_view', function (req, res) {
  db.each("SELECT Id, DataType, ViewName, ActivatedSources,IsActive, Icon FROM Views",
    (error, result) => {
      if (result.Id == req.body.viewId) {
        db.run('UPDATE Views SET IsActive = ? WHERE Id = ?', ['true', result.Id], (err) => {
          if (err) {
            console.log('ERROR!', err)
          }

        })

      } else {
        db.run('UPDATE Views SET IsActive = ? WHERE Id = ?', ['false', result.Id], (err) => {
          if (err) {
            console.log('ERROR!', err)
          }
        })
      }
    }
  );
  res.send(true);
})

//IMAGES :: GET_ALL_IMAGES
app.get('/all_images', function (req, res) {

  var resultArray = [];

  db.all("SELECT Id, ImageCompressed, Orientation, Description FROM Images",
    (error, result) => {
      let resultLength = result.length

      for (let item of result) {
        resultArray.push(item)
      }

      if (resultArray.length == resultLength) {
        res.send(resultArray);
      }
    });
});

//VIDEOS :: GET_ALL_VIDEOS
app.get('/all_videos', function (req, res) {

  var resultArray = [];

  db.all("SELECT * FROM Videos",
    (error, result) => {
      let resultLength = result.length

      for (let item of result) {
        resultArray.push(item)
      }

      if (resultArray.length == resultLength) {
        res.send(resultArray);
      }
    });
});

//SOURCE :: CHANGE_SOURCE
app.post('/change_source', function (req, res) {
  var sourceId = req.body.sourceId;
  var viewId = req.body.viewId;

  var posId;
  if (req.body.posId === '' || req.body.posId === null) {
    posId = 0;
  } else {
    posId = req.body.posId
  }

  db.all("SELECT Id, ActivatedSources FROM Views WHERE ID=$viewID", {
    $viewID: viewId
  },
    (error, results) => {

      var reusltObject = JSON.parse(results[0].ActivatedSources)

      for (let index in reusltObject) {
        if (reusltObject[index].posId === posId) {
          reusltObject[index].sourceId = sourceId
        }

      }
      var resultObjectPlain = JSON.stringify(reusltObject);


      db.run('UPDATE Views SET ActivatedSources = ? WHERE Id = ?', [resultObjectPlain, viewId], (err) => {
        if (err) {
          console.log('ERROR!', err)
        }
        res.send(true)
      })
    });

})

//SOURCE :: DELETE SOURCE
app.post('/delete_image', function (req, res) {
  db.run('DELETE FROM Images WHERE Id=(?)', id = req.body.sourceId, (err) => {
    if (err) {
      return console.log(err.message);
    }
  })

  res.send(true)
})

app.post('/delete_video', function (req, res) {

  db.all("SELECT * FROM Videos", (error, result) => {
    for (let video of result) {
      if (video.Id === req.body.sourceId) {

        fs.unlink(video.VideoUrl, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })

        db.run('DELETE FROM Videos WHERE Id=(?)', id = req.body.sourceId, (err) => {
          if (err) {
            return console.log(err.message);
          }
        })
      }
    }
  });
  res.send(true)
})

// SOURCE :: UPLOAD_IMAGE
app.post('/upload_source', function (req, res) {
  db.run('INSERT INTO Images(ImageCompressed, Image, Orientation, Description) VALUES(?, ?, ?, ?)', [req.body.imageObject.ImageCompressed, req.body.imageObject.Image, req.body.imageObject.Orientation, req.body.imageObject.Description], (err) => {
    if (err) {
      return console.log(err.message);
    }
  })
  res.send(true)
})

//SOURCE :: UPLOAD_VIDEO
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/video/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.mp4')
  }
})

const upload = multer({ storage: storage });

app.post("/upload_video", upload.single("file"), uploadFiles);
function uploadFiles(req, res) {
  db.run('INSERT INTO Videos(VideoName, VideoUrl) VALUES(?, ?)', [req.body.name, req.file.path], (err) => {
    if (err) {
      return console.log(err.message);
    }
    res.json({ upload: true, videoName: req.body.name, videoPath: req.file.path })
  })
}

//FRAME :: GET_ALL_FRAME
app.get('/all_frame', function (req, res) {

  var resultArray = [];

  db.all("SELECT * FROM Frame",
    (error, result) => {
      let resultLength = result.length

      for (let item of result) {
        resultArray.push(item)
      }

      if (resultArray.length == resultLength) {
        res.send(resultArray);
      }
    });
});

//FRAME :: CHANGE_CONTRAST
app.post('/change_contrast', function (req, res) {
  db.run(`UPDATE Frame SET ContrastSettings = ?`, [req.body.contrast], (err) => {
    if (err) {
      return console.log(err.message);
    } else {
      // socket.broadcast.emit("user_settings_response_set_new_contrast", 'ready')
      // console.log('SETTINGS: user_settings_response_set_new_contrast :: DONE')
      // frameGetContrast.getContrast(socket, db)
    }
  })
  res.send(true);
})

//FRAME :: SHUT_DOWN
app.post('/shut_down_frame', function (req, res) {
  if (req.body.shutdown) {
    exec('sudo /sbin/shutdown now', function (msg) { console.log(msg) });
    res.send(true)
  }
})

//FRAME :: RESTART_FRAME
app.post('/restart_frame', function (req, res) {
  if (req.body.restart) {
    exec('sudo /sbin/shutdown -r now', function (msg) { console.log(msg) });
    res.send(true)
  }
})

app.get("/video", function (req, res) {
  db.all("SELECT ActivatedSources FROM Views where IsActive='true'",
    (error, result) => {
      var activatedVideo = JSON.parse(result[0].ActivatedSources)
      for (let index in activatedVideo) {

        var queryActiveVideo = activatedVideo[index].sourceId

        db.all("SELECT Id, VideoName, VideoUrl FROM Videos where Id=$videoId", {
          $videoId: queryActiveVideo
        },
          (error, results) => {
            results.forEach((result) => {

              const range = req.headers.range;
              if (!range) {
                res.status(400).send("Requires Range header");
              }

              // get video stats (about 61MB)
              // const videoPath = result.VideoUrl;
              // const videoSize = fs.statSync(result.VideoUrl).size;

              // get video stats (about 61MB)
              const videoPath = __dirname + '/' + result.VideoUrl;
              const videoSize = fs.statSync(__dirname + '/' + result.VideoUrl).size;

              // Parse Range
              // Example: "bytes=32324-"
              const CHUNK_SIZE = 10 ** 6; // 1MB
              start = Number(range.replace(/\D/g, ""));
              end = Math.min(start + CHUNK_SIZE, videoSize - 1);

              // Create headers
              const contentLength = end - start + 1;
              const headers = {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
              };

              // HTTP Status 206 for Partial Content
              res.writeHead(206, headers);

              // create video read stream for this particular chunk
              const videoStream = fs.createReadStream(videoPath, { start, end });

              // Stream the video chunk to the client
              videoStream.pipe(res);
            })
          });
      }
    })
});

//SOCKETS :: FRAME
io.on("connection", socket => {

  socket.on("request_active_view", (data) => {
    db.each("SELECT Id, DataType, ViewName, ActivatedSources, IsActive FROM Views where IsActive='true'",
      (error, result) => {
        socket.broadcast.emit("response_active_view", { activeView: result })
      }
    );
  })

  socket.on("frame_request_contrast", () => {
    db.each("SELECT ContrastSettings FROM Frame where Id=1",
      (error, result) => {
        socket.broadcast.emit("frame_response_contrast", { contrast: result })
      }
    );
  })

  socket.on("request_active_images", (data) => {

    var imagesNewArray = [];
    var counter = 0;

    db.each("SELECT ActivatedSources FROM Views where IsActive='true'",
      (error, result) => {
        var images = JSON.parse(result.ActivatedSources)

        var copyActivatedImages = images;

        for (let index in copyActivatedImages) {

          var queryActiveImage = copyActivatedImages[index].sourceId

          db.all("SELECT Id, Image, ImageCompressed, Orientation, Description  FROM Images where Id=$imageID", {
            $imageID: queryActiveImage
          },
            (error, results) => {
              results.forEach((result) => {

                imagesNewArray.splice(copyActivatedImages[index].posId, 0, result)

                if (imagesNewArray.length == 4) {
                  socket.broadcast.emit("response_active_images", { activeImages: imagesNewArray })
                } else if (imagesNewArray.length == 1) {
                  socket.broadcast.emit("response_active_images", { activeImages: imagesNewArray })
                }
              })
            });
        }

      }
    );

  })

  socket.on("request_video", (data) => {
    var videoNewArray = [];
    db.all("SELECT ActivatedSources FROM Views where IsActive='true'",
      (error, result) => {
        var activatedVideo = JSON.parse(result[0].ActivatedSources)

        for (let index in activatedVideo) {

          var queryActiveVideo = activatedVideo[index].sourceId

          db.all("SELECT Id, VideoName, VideoUrl FROM Videos where Id=$videoId", {
            $videoId: queryActiveVideo
          },
            (error, results) => {
              results.forEach((result) => {
                videoNewArray.splice(activatedVideo[index].posId, 0, result)

                if (videoNewArray.length == activatedVideo.length) {
                  socket.broadcast.emit("response_video", { activeVideo: videoNewArray })
                }
              })
            });
        }
      })


  })

  // RESET SOCKETS
  var connectedSockets = 0;
  var sockets = {};

  if (!sockets[socket.id]) connectedSockets++;
  sockets[socket.id] = { id: socket.id };
  socket.on('disconnect', function (data) {
    delete sockets[socket.id];
    connectedSockets--;
    // console.log('disconnected ' + socket.id + ' count ' + connectedSockets );
  });
})




server.listen(port, () => console.log(`Listening on port ${port}`));