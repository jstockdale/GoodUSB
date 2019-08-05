/*
   Copyright (c) 2019 Stefan Kremser
   This software is licensed under the MIT License. See the license file for details.
   Source: github.com/spacehuhn/WiFiDuck
 */

#include "i2c.h"

#include <Wire.h>   // i2c stuff

#include "config.h" // i2c config
#include "debug.h"  // debug output

#define RESPONSE_OK 0x00
#define RESPONSE_PROCESSING 0x01
#define RESPONSE_REPEAT 0x02
#define RESPONSE_I2C_ERROR 0xFF

namespace i2c {
    // ===== PRIVATE ===== //
    bool   connection { false };
    size_t connection_tries { 0 };

    uint8_t response   { RESPONSE_OK };

    unsigned long connectionTime { 0 };
    unsigned long requestTime { 0 };

    // ===== PUBLIC ===== //
    void begin() {
        if ((connectionTime == 0) || (millis() - connectionTime > 2000)) {
            Wire.begin(I2C_SDA, I2C_SCL);
            Wire.setClock(I2C_CLOCK_SPEED);

            connection     = true;
            connectionTime = millis();
            ++connection_tries;

            sendRequest();

            debugf("Connecting via i2c...%s\n", connection ? "OK" : "ERROR");
        }
    }

    void update() {
        if (!connection && (connection_tries < NUMBER_CONNECTION_TRIES)) {
            begin();
        } else {
            if ((((response) & (0x01)) == RESPONSE_PROCESSING)
                && (millis() - requestTime > response)) {
                sendRequest();
            }
        }
    }

    bool connected() {
        return connection;
    }

    uint8_t getResponse() {
        return response;
    }

    status getStatus() {
        switch (response) {
            case RESPONSE_OK:
                return status::OK;
            case RESPONSE_REPEAT:
                return status::REPEAT;
            case RESPONSE_I2C_ERROR:
                return status::ERROR;
            default:
                return status::PROCESSING;
        }
    }

    void sendRequest() {
        if (!connection) return;

        requestTime = millis();

        Wire.requestFrom(I2C_ADDR, 1);

        if (Wire.available()) {
            response = Wire.read();
        } else {
            connection = false;
            response   = RESPONSE_I2C_ERROR;

            debugln("Request error :(");
        }
    }

    void transmit(uint8_t* data, size_t len) {
        if (!connection) return;
        if (len > BUFFER_SIZE) len = BUFFER_SIZE;

        unsigned int transmissions {
            (len / PACKET_SIZE) + (len % PACKET_SIZE > 0)
        };

        unsigned int data_i       { 0 };
        unsigned int transmission_i { 0 };
        unsigned int packet_i       { 0 };

        for (transmission_i = 0; transmission_i < transmissions; ++transmission_i) {
            Wire.beginTransmission(I2C_ADDR);

            for (packet_i = 0; packet_i < PACKET_SIZE && data_i < len; ++packet_i) {
                debug(char(data[data_i]));
                Wire.write(data[data_i++]);
            }

            Wire.endTransmission();
        }
    }
}